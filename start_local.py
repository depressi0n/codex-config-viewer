from __future__ import annotations

import argparse
import shutil
import subprocess
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
TARGET_URL = "http://localhost:3000"
WAIT_TIMEOUT_SECONDS = 60


def 输出(message: str) -> None:
    print(f"[Codex Config Viewer] {message}")


def 暂停退出(exit_code: int) -> None:
    try:
        input("按回车键关闭窗口...")
    except EOFError:
        pass
    raise SystemExit(exit_code)


def 查找命令(name: str) -> str | None:
    return shutil.which(name)


def 服务可访问(url: str = TARGET_URL) -> bool:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "codex-config-viewer-launcher"},
    )
    try:
        with urllib.request.urlopen(request, timeout=1.5):
            return True
    except urllib.error.HTTPError:
        return True
    except Exception:
        return False


def 需要安装依赖(force_install: bool) -> bool:
    if force_install:
        return True

    node_modules = PROJECT_DIR / "node_modules"
    modules_state = node_modules / ".modules.yaml"
    lock_file = PROJECT_DIR / "pnpm-lock.yaml"

    if not node_modules.exists():
        return True

    if lock_file.exists() and modules_state.exists():
        return lock_file.stat().st_mtime > modules_state.stat().st_mtime

    return False


def 运行命令(command: str) -> int:
    completed = subprocess.run(
        ["cmd.exe", "/c", command],
        cwd=str(PROJECT_DIR),
        check=False,
    )
    return completed.returncode


def 启动新控制台(command: str) -> subprocess.Popen[bytes]:
    return subprocess.Popen(
        ["cmd.exe", "/k", command],
        cwd=str(PROJECT_DIR),
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )


def 选择包管理器() -> tuple[str | None, str | None, str]:
    pnpm = 查找命令("pnpm")
    if pnpm:
        quoted = f'"{pnpm}"'
        return quoted, quoted, "pnpm"

    npm = 查找命令("npm")
    if npm:
        quoted = f'"{npm}"'
        return None, quoted, "npm"

    return None, None, "unknown"


def 等待服务启动(timeout_seconds: int) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if 服务可访问():
            return True
        time.sleep(1)
    return False


def 主流程() -> int:
    parser = argparse.ArgumentParser(
        description="双击启动 Codex Config Viewer，并在可用后自动打开浏览器。"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="只检查环境，不安装依赖也不启动服务。",
    )
    parser.add_argument(
        "--force-install",
        action="store_true",
        help="无论当前状态如何，都重新执行一次依赖安装。",
    )
    parser.add_argument(
        "--wait-seconds",
        type=int,
        default=WAIT_TIMEOUT_SECONDS,
        help="启动后等待站点就绪的秒数，默认 60。",
    )
    args = parser.parse_args()

    输出(f"项目目录：{PROJECT_DIR}")

    node = 查找命令("node")
    install_command, dev_command, manager_name = 选择包管理器()

    if not node:
        输出("未检测到 Node.js。请先安装 Node.js LTS。")
        return 1

    if not dev_command:
        输出("未检测到 pnpm 或 npm，无法启动项目。")
        输出("建议先安装 pnpm，然后重新双击本脚本。")
        return 1

    输出(f"检测到 Node.js：{node}")
    输出(f"检测到包管理器：{manager_name}")

    if args.check:
        if 需要安装依赖(args.force_install):
            输出("检查结果：需要安装或刷新依赖。")
        else:
            输出("检查结果：依赖看起来已就绪。")
        if 服务可访问():
            输出(f"检查结果：{TARGET_URL} 当前可访问。")
        else:
            输出(f"检查结果：{TARGET_URL} 当前不可访问。")
        return 0

    if 服务可访问():
        输出("检测到本地服务已经在运行，直接打开浏览器。")
        webbrowser.open(TARGET_URL)
        return 0

    should_install = 需要安装依赖(args.force_install)
    if should_install and not install_command:
        输出("当前需要安装依赖，但未检测到 pnpm。")
        输出("请先安装 pnpm，或手动执行一次依赖安装。")
        return 1

    if should_install:
        输出("开始安装/同步依赖，这一步可能需要一些时间...")
        install_full_command = (
            f'cd /d "{PROJECT_DIR}" && {install_command} install --frozen-lockfile'
        )
        return_code = 运行命令(install_full_command)
        if return_code != 0:
            输出(f"依赖安装失败，退出码：{return_code}")
            return return_code
    else:
        输出("依赖已存在，跳过安装。")

    输出("启动开发服务器...")
    if manager_name == "pnpm":
        dev_full_command = f'cd /d "{PROJECT_DIR}" && {dev_command} dev'
    else:
        dev_full_command = f'cd /d "{PROJECT_DIR}" && {dev_command} run dev'

    启动新控制台(dev_full_command)

    输出(f"等待站点就绪：{TARGET_URL}")
    if 等待服务启动(args.wait_seconds):
        输出("站点已启动，正在打开浏览器。")
        webbrowser.open(TARGET_URL)
        return 0

    输出("在等待时间内未检测到站点可访问。")
    输出("开发服务器窗口已打开，请检查其中的报错信息。")
    return 1


if __name__ == "__main__":
    try:
        code = 主流程()
    except KeyboardInterrupt:
        输出("已取消。")
        code = 130
    except Exception as exc:
        输出(f"发生未处理异常：{exc}")
        code = 1

    if code != 0:
        暂停退出(code)
