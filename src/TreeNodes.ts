// ********************************************************************************************************************
// * Ran Lehr (Early.AI) 05/11/2023                                                                                   *
// * Changes:                                                                                                         *
// * - FunctionCoverageNode was added, showing how many times each function was hit. It extends CoverageBaseNode.     *
// * - CoverageBaseNode was added. It extends BaseNode and CoverageNode inherits from it.                             *
// * - Rest of changes in code took place in order to support the changes above.                                      *
// ********************************************************************************************************************
import * as iopath from "path";
import * as vscode from "vscode";
import { CoverageLevel } from "./CoverageLevel";
import { type CoverageLevelThresholds } from "./CoverageLevel";

export abstract class BaseNode extends vscode.TreeItem {
    constructor(
        public readonly path: string,
        public readonly label: string,
        public readonly children: CoverageBaseNode[],
        collapsibleState: vscode.TreeItemCollapsibleState | undefined
    ) {
        super(label, collapsibleState);
    }

    // @ts-expect-error Children are settable, thus this value can't be set in the constructor, maybe it should be updated whenever the children are updated
    public get resourceUri(): vscode.Uri {
        return vscode.Uri.file(this.path);
    }
}

export class RootCoverageNode extends BaseNode {
    constructor(path: string, label: string, children: CoverageNode[] = []) {
        super(path, label, children, vscode.TreeItemCollapsibleState.Collapsed);
    }

    get totalLinesCount(): number {
        let sum = 0;
        this.children.forEach((n) => (sum += n.totalLinesCount ?? 0));
        return sum;
    }

    get coveredLinesCount(): number {
        let sum = 0;
        this.children.forEach((n) => (sum += n.coveredLinesCount ?? 0));
        return sum;
    }
}

export abstract class CoverageBaseNode extends BaseNode {
    public abstract get totalLinesCount(): number | undefined;
    public abstract get coveredLinesCount(): number | undefined;

    protected abstract formatCoverage(): string;

    protected abstract getCoverageLevel(): CoverageLevel;

    // @ts-expect-error Children are settable, thus this value can't be set in the constructor, maybe it should be updated whenever the children are updated
    get tooltip(): string {
        return `${this.label}: ${this.formatCoverage()}`;
    }

    // @ts-expect-error Children are settable, thus this value can't be set in the constructor, maybe it should be updated whenever the children are updated
    get description(): string {
        return this.formatCoverage();
    }

    // @ts-expect-error Children are settable, thus this value can't be set in the constructor, maybe it should be updated whenever the children are updated
    get iconPath(): { light: string; dark: string; } {
        const light = iopath.join(__dirname, "..", "resources", "light", `${this.getCoverageLevel().toString()}.svg`);
        const dark = iopath.join(__dirname, "..", "resources", "dark", `${this.getCoverageLevel().toString()}.svg`);
        return {
            light,
            dark
        };
    }
}

export abstract class CoverageNode extends CoverageBaseNode {
    constructor(
        path: string,
        label: string,
        children: CoverageBaseNode[],
        collapsibleState: vscode.TreeItemCollapsibleState | undefined,
        private readonly coverageLevelThresholds: CoverageLevelThresholds
    ) {
        super(path, label, children, collapsibleState);
    }

    public abstract get totalLinesCount(): number;

    public abstract get coveredLinesCount(): number;

    private getCoveragePercent(): number {
        return this.totalLinesCount === 0 ? 100 : (this.coveredLinesCount / this.totalLinesCount) * 100;
    }

    protected formatCoverage(): string {
        return `${+this.getCoveragePercent().toFixed(1)}%`;
    }

    protected getCoverageLevel(): CoverageLevel {
        const coverageLevel = this.getCoveragePercent() >= this.coverageLevelThresholds.sufficientCoverageThreshold
            ? CoverageLevel.High
            : this.getCoveragePercent() >= this.coverageLevelThresholds.lowCoverageThreshold
                ? CoverageLevel.Medium
                : CoverageLevel.Low;
        return coverageLevel;
    }
}

export class FunctionCoverageNode extends CoverageBaseNode {
    constructor(
      path: string,
      line: number,
      label: string,
      public readonly hitCount: number
    ) {
        super(path, label, [], vscode.TreeItemCollapsibleState.None);
        
        this.contextValue = FunctionCoverageNode.name;
        this.command = {
            command: "vscode.open",
            title: "Open",
            arguments: [vscode.Uri.file(this.path)]
        };
    }

    public get totalLinesCount(): undefined {
        return undefined;
    }

    public get coveredLinesCount(): undefined {
        return undefined;
    }

    protected formatCoverage(): string {
        return `${+this.hitCount} hits`;
    }

    protected getCoverageLevel(): CoverageLevel {
        return this.hitCount > 0 ? CoverageLevel.High : CoverageLevel.Low;
    }
}

export class FileCoverageNode extends CoverageNode {
    constructor(
        path: string,
        label: string,
        children: FunctionCoverageNode[] = [],
        coverageLevelThresholds: CoverageLevelThresholds,
        public readonly totalLinesCount: number,
        public readonly coveredLinesCount: number
    ) {
        super(path,
            label,
            children,
            children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            coverageLevelThresholds);
        this.contextValue = FileCoverageNode.name;
        this.command = {
            command: "vscode.open",
            title: "Open",
            arguments: [vscode.Uri.file(this.path)]
        };
    }
}

export class FolderCoverageNode extends CoverageNode {
    constructor(path: string, label: string, children: CoverageNode[] = [], coverageLevelThresholds: CoverageLevelThresholds) {
        super(path, label, children, vscode.TreeItemCollapsibleState.Collapsed, coverageLevelThresholds);
    }

    get totalLinesCount(): number {
        let sum = 0;
        this.children.forEach((n) => (sum += n.totalLinesCount ?? 0));
        return sum;
    }

    get coveredLinesCount(): number {
        let sum = 0;
        this.children.forEach((n) => (sum += n.coveredLinesCount ?? 0));
        return sum;
    }
}
