import httpx
import json
import logging
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)


class MiniMaxService:
    def __init__(self):
        self.api_key = settings.MINIMAX_API_KEY
        self.api_url = settings.MINIMAX_API_URL
        self.model = settings.MINIMAX_MODEL

    def build_prompt(self, user_input: str, scene_context: List[dict]) -> str:
        context_str = "当前场景已有物体：\n"
        if scene_context:
            for obj in scene_context:
                context_str += f"- {obj.get('description', obj.get('shape', '未知'))} (ID: {obj.get('id')})\n"
        else:
            context_str += "（空）\n"

        example = (
            '[\n'
            '  {"action":"create","shape":"cuboid","params":{"width":2,"height":1.2,"depth":0.1},'
            '"transform":{"position":[0,0.6,0],"rotation":[0,0,0],"scale":[1,1,1]},'
            '"material":{"color":"#808080","opacity":1},"description":"显示器屏幕"},\n'
            '  {"action":"create","shape":"cuboid","params":{"width":2.1,"height":1.3,"depth":0.05},'
            '"transform":{"position":[0,0.6,-0.05],"rotation":[0,0,0],"scale":[1,1,1]},'
            '"material":{"color":"#333333","opacity":1},"description":"显示器边框"},\n'
            '  {"action":"create","shape":"cuboid","params":{"width":0.8,"height":0.1,"depth":0.8},'
            '"transform":{"position":[0,0.05,0.2],"rotation":[0,0,0],"scale":[1,1,1]},'
            '"material":{"color":"#555555","opacity":1},"description":"键盘"}\n'
            ']'
        )

        prompt = (
            f"你是基于 OpenGeometry 的 3D 建模助手。OpenGeometry 是一个浏览器端的 CAD 几何内核，支持 B-Rep 实体建模。请按以下步骤处理用户需求：\n\n"
            f"1. 分析用户想要绘制的物体。\n"
            f"2. 思考该物体可以拆分成哪些 OpenGeometry 基本几何体或操作。复杂物体由多个简单几何体组合；简单物体可直接用一个几何体。\n"
            f"3. 为每个基本几何体生成一条 create 命令，合理安排它们的位置、旋转和缩放，使它们在场景中组合成目标物体。\n"
            f"4. 以 JSON 数组的形式输出所有 create 命令。\n\n"
            f"{context_str}"
            "OpenGeometry 可用元素：\n"
            "- 基础 2D/线型图元（primitives）：arc, curve, line, polyline, rectangle\n"
            "- 3D 实体形状（shapes）：cuboid, cylinder, sphere, wedge, polygon, opening, sweep\n"
            "- 建模操作（operations）：boolean(union/subtract/intersect), extrude, offset, sweep, triangulate\n"
            "- 导出（export）：stl, step, ifc, pdf\n\n"
            "当前支持的命令类型：create, modify, delete, transform, boolean, export\n\n"
            "选择几何体时的建议：\n"
            "- 箱体结构用 cuboid（如机身、屏幕、键盘按键、房屋墙体）。\n"
            "- 圆柱/圆管用 cylinder（如轮子、柱子、管道）。\n"
            "- 球体/球状结构用 sphere（如球、关节、按钮）。\n"
            "- 斜面/三角棱柱用 wedge。\n"
            "- 2D 轮廓/面板用 polygon 或 rectangle。\n"
            "- 需要沿路径扫掠的复杂截面用 sweep。\n\n"
            "每条 create 命令的 JSON 格式：\n"
            '{"action":"create","shape":"形状名","params":{形状参数},'
            '"transform":{"position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z]},'
            '"material":{"color":"#颜色","opacity":透明度},'
            '"description":"该部分的描述"}\n\n'
            "示例（用户输入：画一台电脑）：\n"
            f"{example}\n\n"
            "注意：\n"
            "- 只输出 JSON 数组，不要输出其他文字。\n"
            "- 即使是简单物体也要输出 JSON 数组（可只包含一个元素）。\n"
            "- position 使用世界坐标，所有部件的位置应相对组合成完整物体。\n"
            "- 颜色使用 #RRGGBB 格式。\n"
            "- 优先使用实体形状（cuboid/cylinder/sphere/wedge）而不是 2D 图元来构建可渲染的 3D 物体。\n\n"
            f"用户输入：{user_input}\n\n"
            "请只输出 JSON 数组，不要有其他文字。"
        )

        return prompt

    async def chat(self, user_input: str, scene_context: List[dict]) -> dict:
        prompt = self.build_prompt(user_input, scene_context)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
        except httpx.HTTPStatusError as e:
            logger.error("MiniMax API HTTP error: %s - %s", e.response.status_code, e.response.text)
            return {
                "command": None,
                "description": f"MiniMax API 请求失败 (HTTP {e.response.status_code})"
            }
        except httpx.RequestError as e:
            logger.error("MiniMax API request error: %s", e)
            return {
                "command": None,
                "description": f"无法连接到 MiniMax API: {e}"
            }

        content = self._extract_content(result)
        if content is None:
            logger.error("MiniMax API response missing content: %s", result)
            return {
                "command": None,
                "description": "MiniMax API 返回格式异常"
            }

        return self.parse_response(content)

    def _extract_content(self, result: dict) -> str | None:
        # Responses API format: output[0].content[0].text
        output = result.get("output")
        if isinstance(output, list) and output:
            first_output = output[0]
            if isinstance(first_output, dict):
                content = first_output.get("content")
                if isinstance(content, list) and content:
                    first_content = content[0]
                    if isinstance(first_content, dict):
                        text = first_content.get("text")
                        if isinstance(text, str):
                            return text
                # Fallback: output[0].text
                text = first_output.get("text")
                if isinstance(text, str):
                    return text

        # Chat completion format: choices[0].message.content
        choices = result.get("choices")
        if isinstance(choices, list) and choices:
            message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
            content = message.get("content")
            if isinstance(content, str):
                return content

        # Direct fields
        for key in ("content", "text", "response"):
            value = result.get(key)
            if isinstance(value, str):
                return value

        return None

    def parse_response(self, content: str) -> dict:
        try:
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]

            content = content.strip()

            data = json.loads(content)

            if isinstance(data, dict):
                data = [data]
            elif not isinstance(data, list):
                return {
                    "command": None,
                    "commands": None,
                    "description": "无法理解您的描述，请尝试更具体的描述"
                }

            commands = []
            for item in data:
                if not isinstance(item, dict) or item.get("action") != "create":
                    continue
                commands.append(item)

            if not commands:
                return {
                    "command": None,
                    "commands": None,
                    "description": "无法理解您的描述，请尝试更具体的描述"
                }

            descriptions = [cmd.get("description", self.generate_description(cmd)) for cmd in commands]

            return {
                "command": None,
                "commands": commands,
                "description": "；".join(descriptions) if descriptions else "已创建物体"
            }

        except json.JSONDecodeError:
            return {
                "command": None,
                "commands": None,
                "description": f"解析失败: {content[:100]}..."
            }

    def generate_description(self, command: dict) -> str:
        action = command.get("action")
        shape = command.get("shape")

        descriptions = {
            "create": f"创建了一个 {shape}" if shape else "创建了新物体",
            "modify": "修改了物体",
            "delete": "删除了物体",
            "transform": "变换了物体",
            "boolean": f"对物体进行了 {command.get('operation')} 运算",
            "export": f"准备导出 {command.get('format')} 格式"
        }

        return descriptions.get(action, "执行了操作")


minimax_service = MiniMaxService()