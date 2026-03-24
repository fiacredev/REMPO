import * as vscode from "vscode";
import * as cp from "child_process";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Git Helper");
  const treeDataProvider = new GitTreeProvider(outputChannel);
  vscode.window.registerTreeDataProvider("git-helper-view", treeDataProvider);

  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("git-helper.refresh", () =>
      treeDataProvider.refresh()
    )
  );

  // Commit command
  context.subscriptions.push(
    vscode.commands.registerCommand("git-helper.commit", async () => {
      const repoPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoPath) {
        vscode.window.showErrorMessage("No folder opened!");
        return;
      }

      // Check if Git repo
      try {
        cp.execSync("git rev-parse --is-inside-work-tree", { cwd: repoPath });
      } catch (err: any) {
        const msg = "Folder is not a Git repository!";
        vscode.window.showErrorMessage(msg);
        outputChannel.show();
        outputChannel.appendLine(`Git Helper Error: ${err.message}`);
        return;
      }

      const commitMessage = await vscode.window.showInputBox({
        prompt: "Enter commit message",
      });
      if (!commitMessage) return;

      try {
        cp.execSync("git add .", { cwd: repoPath });
        cp.execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath });
        vscode.window.showInformationMessage("Committed!");
        treeDataProvider.refresh();
      } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
        outputChannel.show();
        outputChannel.appendLine(`Git Helper Error: ${err.message}`);
      }
    })
  );
}

export class GitTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined | null
  > = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> =
    this._onDidChangeTreeData.event;

  constructor(private outputChannel: vscode.OutputChannel) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    const repoPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoPath)
      return Promise.resolve([new vscode.TreeItem("No folder opened")]);

    try {
      // Check if Git repo
      cp.execSync("git rev-parse --is-inside-work-tree", { cwd: repoPath });

      const branch = cp
        .execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoPath })
        .toString()
        .trim();
		const latestCommit = cp
		.execSync('git log -1 --pretty=format:"%h - %s"', { cwd: repoPath })
		.toString()
		.trim();
      const status = cp
        .execSync("git status --porcelain", { cwd: repoPath })
        .toString()
        .trim();

      const children: vscode.TreeItem[] = [
        new vscode.TreeItem(`Branch: ${branch}`),
        new vscode.TreeItem(`Latest: ${latestCommit}`),
      ];

      if (status) {
        const files = status.split("\n").map((line) => line.substring(3));
        children.push(
          new vscode.TreeItem("Uncommitted Files:"),
          ...files.map((f) => new vscode.TreeItem(`- ${f}`))
        );
      }

      return Promise.resolve(children);
    } catch (err: any) {
      // Show friendly message in TreeView
      const item = new vscode.TreeItem("Not a Git repository");
      // Also log the full error to Output panel
      this.outputChannel.show();
      this.outputChannel.appendLine(`Git Helper Error: ${err.message}`);
      return Promise.resolve([item]);
    }
  }
}