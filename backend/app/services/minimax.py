import httpx
import json
from typing import List, Optional
from app.core.config import settings


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

        prompt = f"""你是一个3D建模助手。用户描述需求，你输出JSON命令。

{context_str}
支持的形状：cuboid, cylinder, sphere, wedge, polygon, arc, curve, line, polyline, rectangle
支持的命令类型：create, modify, delete, transform, boolean, export

请根据用户输入生成JSON命令。只输出JSON，不要其他内容。
JSON格式说明：
- create: {{"action":"create","shape":"形状名","params":{{参数}}},"transform":{{"position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z]}},"material":{{"color":"#颜色","opacity":透明度}},"description":"描述"}}
- modify: {{"action":"modify","id":"物体ID","params":{{修改的参数}}},"description":"描述"}}
- delete: {{"action":"delete","id":"物体ID"}}
- transform: {{"action":"transform","id":"物体ID","transform":{{"position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z]}}}}
- boolean: {{"action":"boolean","operation":"union|subtract|intersect","ids":["ID1","ID2"],"description":"描述"}}
- export: {{"action":"export","format":"stl|step|ifc|pdf","options":{{}}}}

用户输入：{user_input}

请只输出JSON，不要有其他文字。"""

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
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2048
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.api_url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()

        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")

        return self.parse_response(content)

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

            command = json.loads(content)

            if "action" not in command:
                return {
                    "command": None,
                    "description": "无法理解您的描述，请尝试更具体的描述"
                }

            description = command.get("description", self.generate_description(command))

            return {
                "command": command,
                "description": description
            }

        except json.JSONDecodeError:
            return {
                "command": None,
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