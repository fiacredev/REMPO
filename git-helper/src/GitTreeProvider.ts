import * as vscode from 'vscode';

export class GitTreeProvider implements vscode.TreeDataProvider<any> {

    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(null);
    }

    getTreeItem(element: any): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<vscode.TreeItem[]> {

        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;

        if (!gitExtension) {
            return [];
        }

        const git = gitExtension.getAPI(1);
        const repo = git.repositories[0];

        if (!repo) {
            return [new vscode.TreeItem("No Git repository found, My Mellow.")];
        }

        const items: vscode.TreeItem[] = [];

        // Branch + commit
        const head = repo.state.HEAD;
        items.push(new vscode.TreeItem(`Branch: ${head?.name}`));
        items.push(new vscode.TreeItem(`Latest: ${head?.commit?.substring(0, 7)}`));

        // Files
        const changes = repo.state.workingTreeChanges;

        if (changes.length === 0) {
            items.push(new vscode.TreeItem("✔ No changes"));
        } else {
            changes.forEach((change: any) => {
                const fileName = change.uri.fsPath.split('/').pop();
                items.push(new vscode.TreeItem(fileName));
            });
        }

        return items;
    }
}