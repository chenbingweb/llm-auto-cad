import httpx
import json
import logging
import re
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)


class MiniMaxService:
    def __init__(self):
        self.api_key = settings.MINIMAX_API_KEY
        self.api_url = settings.MINIMAX_API_URL
        self.model = settings.MINIMAX_MODEL

    def build_cascade_prompt(self, user_input: str, scene_context: List[dict]) -> str:
        context_str = "当前场景已有物体：\n"
        if scene_context:
            for obj in scene_context:
                context_str += f"- {obj.get('description', obj.get('shape', '未知'))} (ID: {obj.get('id')})\n"
        else:
            context_str += "（空）\n"

        example = '''```js
let width   = 80;
let depth   = 60;
let height  = 30;
let wall    = 3;
let filletR = 6;

// --- 桌面收纳盒 ---
let outerFace = new Sketch([-width/2, -depth/2])
  .LineTo([ width/2, -depth/2]).Fillet(filletR)
  .LineTo([ width/2,  depth/2]).Fillet(filletR)
  .LineTo([-width/2,  depth/2]).Fillet(filletR)
  .LineTo([-width/2, -depth/2]).Fillet(filletR)
  .End(true).Face();

let tray = Extrude(outerFace, [0, 0, height], true);
let innerFace = Offset(outerFace, -wall);
let topEdges = Edges(tray).max([0,0,1]).indices();
tray = FilletEdges(tray, wall * 0.4, topEdges);
let cavity = Translate([0, 0, wall], Extrude(innerFace, [0, 0, height]));
tray = Difference(tray, [cavity]);

let divider = Translate([-(depth - wall*2)/2, -wall/2, wall],
  Box(depth - wall*2, wall, height - wall*2));
tray = Union([tray, divider]);

// --- 侧边笔筒 ---
let penR = depth / 4;
let penH = height * 1.6;
let penX = width/2 + penR + 3;
let cupProfile = Polygon([
  [0, 0, 0], [penR, 0, 0], [penR, 0, penH],
  [penR - wall, 0, penH], [penR - wall, 0, wall], [0, 0, wall]
]);
let holder = Revolve(cupProfile, 360, [0, 0, 1]);
let chamferEdges = Edges(holder).max([0,0,1]).ofType("Circle").indices();
holder = ChamferEdges(holder, wall * 0.3, chamferEdges);
holder = Translate([penX, 0, 0], holder);

// --- 装饰孔 ---
let cutR = Math.min(8, height * 0.25);
let cutout = Translate([0, -depth/2, height * 0.5], Sphere(cutR));
tray = Difference(tray, [cutout, Mirror([0, 1, 0], cutout)]);

// --- 台灯 ---
let base = Box(0.6, 0.6, 0.1);
base = Translate([0, 0, 0.05], base);
let stem = Cylinder(0.04, 0.5);
stem = Translate([0, 0, 0.35], stem);
let shade = Cylinder(0.2, 0.2);
shade = Translate([0, 0, 0.7], shade);

sceneShapes.push(tray, holder, base, stem, shade);
```'''

        prompt = (
            f"你是基于 CascadeStudio 的 3D 建模助手。CascadeStudio 是一个在浏览器中运行的 "
            f"OpenCASCADE 几何内核，使用 JavaScript API 描述 3D 模型。\n\n"
            f"任务：根据用户的自然语言描述，生成一段可执行的 CascadeStudio JavaScript 代码，"
            f"用于创建对应的 3D 模型。\n\n"
            f"{context_str}"
            f"可用的主要函数（StandardLibrary）：\n"
            f"- 基础实体：Box(x, y, z), Sphere(radius), Cylinder(radius, height), "
            f"Cone(radius1, radius2, height), Wedge(dx, dy, dz, ltx)\n"
            f"- 变换：Translate([x, y, z], shape), Rotate(axis, degrees, shape), "
            f"Scale(factor, shape), Mirror(normal, shape)\n"
            f"- 布尔运算：Union(shapes), Difference(main, shapes), Intersection(shapes)\n"
            f"- 拉伸/放样：Extrude(face, [dx, dy, dz]), Revolve(shape, degrees, axis), "
            f"Loft(wires), Pipe(shape, path)\n"
            f"- 圆角/倒角：FilletEdges(shape, radius), ChamferEdges(shape, distance)\n"
            f"- 偏移/边面选择器：Offset(shape, distance), Edges(shape), Faces(shape)\n"
            f"- 草图：new Sketch([x, y], 'XY').LineTo(...).Face()\n"
            f"- 测量/查询：Volume(shape), SurfaceArea(shape), CenterOfMass(shape)\n\n"
            f"重要规则：\n"
            f"1. 只输出一段 JavaScript 代码，用 ```js ... ``` 包裹。\n"
            f"2. 不要使用 function、return、console.log、import/export。\n"
            f"3. 每个创建的形状都要使用，并最终放入 sceneShapes 数组中。\n"
            f"4. 所有尺寸使用合理的数值，position/translation 使用世界坐标。\n"
            f"5. 复杂物体拆分成多个简单几何体并用变换组合。\n"
            f"6. 如果只需要简单形状，也按规则输出完整代码。\n"
            f"7. 变换函数（Translate/Rotate/Scale/Mirror）返回新的形状，必须用 `shape = Translate([x, y, z], shape)` 这样的形式重新赋值，否则原形状不会移动。\n"
            f"8. CascadeStudio 是 Z 轴向上，立式物体（如台灯、瓶子、柱子）应沿 Z 轴堆叠；所有部件的位置要以组成一个整体为目标，不要分散在不同角落。\n\n"
            f"示例（用户输入：画一个带台灯的桌面收纳盒）：\n"
            f"{example}\n\n"
            f"用户输入：{user_input}\n\n"
            f"请只输出 ```js 包裹的 JavaScript 代码，不要有其他解释文字。"
        )

        return prompt

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

    async def chat(self, user_input: str, scene_context: List[dict], mode: str = "cascade") -> dict:
        if mode == "cascade":
            prompt = self.build_cascade_prompt(user_input, scene_context)
        else:
            prompt = self.build_prompt(user_input, scene_context)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "input": prompt
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
                "commands": None,
                "code": None,
                "description": f"MiniMax API 请求失败 (HTTP {e.response.status_code})"
            }
        except httpx.RequestError as e:
            logger.error("MiniMax API request error: %s", e)
            return {
                "command": None,
                "commands": None,
                "code": None,
                "description": f"无法连接到 MiniMax API: {e}"
            }

        content = self._extract_content(result)
        if content is None:
            logger.error("MiniMax API response missing content: %s", result)
            return {
                "command": None,
                "commands": None,
                "code": None,
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

        # Direct fields
        for key in ("content", "text", "response"):
            value = result.get(key)
            if isinstance(value, str):
                return value

        return None

    def parse_response(self, content: str) -> dict:
        try:
            content = content.strip()

            # Remove thinking tags if present
            content = content.replace('<think>', '').replace('</think>', '')

            # Try to extract code block first
            code = self._extract_code(content)
            if code:
                return {
                    "command": None,
                    "commands": None,
                    "code": code,
                    "description": self._generate_code_description(code)
                }

            # Fall back to JSON parsing and convert commands to code
            parsed = self._parse_json_commands(content)
            if parsed.get("commands"):
                code = self._commands_to_code(parsed["commands"])
                if code:
                    parsed["code"] = code
                    parsed["commands"] = None
            return parsed

        except Exception as e:
            logger.error("Failed to parse MiniMax response: %s", e)
            return {
                "command": None,
                "commands": None,
                "code": None,
                "description": f"解析失败: {content[:100]}..."
            }

    def _extract_code(self, content: str) -> str | None:
        # Match ```js ... ``` or ```javascript ... ```
        patterns = [
            r"```js\n(.*?)\n```",
            r"```javascript\n(.*?)\n```",
            r"```\n(.*?)\n```",
        ]
        for pattern in patterns:
            match = re.search(pattern, content, re.DOTALL)
            if match:
                code = match.group(1).strip()
                if code:
                    return code

        # If no markdown fence but looks like JS with sceneShapes, return as-is
        if "sceneShapes" in content and "function" not in content:
            return content.strip()

        return None

    def _generate_code_description(self, code: str) -> str:
        # Extract shape names from Box/Sphere/Cylinder/etc. calls
        shape_calls = re.findall(r"\b(Box|Sphere|Cylinder|Cone|Wedge|Torus|Extrude|Revolve|Loft|Pipe)\s*\(", code)
        if shape_calls:
            shape_names = {
                "Box": "立方体", "Sphere": "球体", "Cylinder": "圆柱",
                "Cone": "圆锥", "Wedge": "楔形体", "Torus": "圆环",
                "Extrude": "拉伸体", "Revolve": "旋转体", "Loft": "放样体", "Pipe": "管道"
            }
            names = [shape_names.get(s, s) for s in shape_calls]
            return f"已创建模型，包含：{', '.join(names)}"
        return "已生成 3D 建模代码"

    def _commands_to_code(self, commands: List[dict]) -> str | None:
        lines = []
        shape_index = 0

        for cmd in commands:
            if cmd.get("action") != "create":
                continue

            shape = cmd.get("shape", "")
            params = cmd.get("params") or {}
            transform = cmd.get("transform") or {}
            description = cmd.get("description", "")

            var_name = f"shape_{shape_index}"
            shape_index += 1

            if shape in ("box", "cuboid"):
                w = params.get("width", 1)
                h = params.get("height", 1)
                d = params.get("depth", 1)
                lines.append(f"let {var_name} = Box({w}, {h}, {d});")
            elif shape == "cylinder":
                r = params.get("radius", 0.5)
                h = params.get("height", 1)
                lines.append(f"let {var_name} = Cylinder({r}, {h});")
            elif shape == "sphere":
                r = params.get("radius", 0.5)
                lines.append(f"let {var_name} = Sphere({r});")
            elif shape == "cone":
                r1 = params.get("radius1", 0.5)
                r2 = params.get("radius2", 0)
                h = params.get("height", 1)
                lines.append(f"let {var_name} = Cone({r1}, {r2}, {h});")
            elif shape == "torus":
                r = params.get("radius", 1)
                tr = params.get("tubeRadius", 0.3)
                lines.append(f"let {var_name} = Torus({r}, {tr});")
            else:
                # Unsupported shape for conversion
                return None

            position = transform.get("position")
            if position and any(v != 0 for v in position):
                lines.append(f"{var_name} = Translate([{position[0]}, {position[1]}, {position[2]}], {var_name});")

            rotation = transform.get("rotation")
            if rotation and any(v != 0 for v in rotation):
                if rotation[0] != 0:
                    lines.append(f"{var_name} = Rotate([1, 0, 0], {rotation[0]}, {var_name});")
                if rotation[1] != 0:
                    lines.append(f"{var_name} = Rotate([0, 1, 0], {rotation[1]}, {var_name});")
                if rotation[2] != 0:
                    lines.append(f"{var_name} = Rotate([0, 0, 1], {rotation[2]}, {var_name});")

            scale = transform.get("scale")
            if scale and any(v != 1 for v in scale):
                # Scale only accepts a scalar in CascadeStudio; use the first value
                lines.append(f"{var_name} = Scale({scale[0]}, {var_name});")

            if description:
                lines.append(f"// {description}")

        if not lines:
            return None

        lines.append("sceneShapes.push(" + ", ".join(f"shape_{i}" for i in range(shape_index)) + ");")
        return "\n".join(lines)

    def _parse_json_commands(self, content: str) -> dict:
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        content = content.strip()

        # Try to find JSON array/object in content
        json_match = None
        for pattern in [r'\[[\s\S]*\]', r'\{[\s\S]*\}']:
            match = re.search(pattern, content)
            if match:
                try:
                    json_data = json.loads(match.group())
                    if isinstance(json_data, list) or (isinstance(json_data, dict) and 'action' in json_data):
                        json_match = json_data
                        break
                except Exception:
                    continue

        if json_match:
            data = json_match
        else:
            # Not JSON, return as description
            return {
                "command": None,
                "commands": None,
                "code": None,
                "description": content[:200] if len(content) > 200 else content
            }

        if isinstance(data, dict):
            data = [data]
        elif not isinstance(data, list):
            return {
                "command": None,
                "commands": None,
                "code": None,
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
                "code": None,
                "description": "无法理解您的描述，请尝试更具体的描述"
            }

        descriptions = [cmd.get("description", self.generate_description(cmd)) for cmd in commands]

        return {
            "command": None,
            "commands": commands,
            "code": None,
            "description": "；".join(descriptions) if descriptions else "已创建物体"
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
