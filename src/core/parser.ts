import { parseTree, Node, findNodeAtLocation } from 'jsonc-parser';

export interface ConfigNodeInfo {
    value: any;
    offset: number;
    length: number;
}

export interface TsConfigData {
    references?: ConfigNodeInfo;
    include?: ConfigNodeInfo;
    paths?: ConfigNodeInfo;
}

export function parseTsConfig(content: string): TsConfigData {
    const root = parseTree(content);
    if (!root || root.type !== 'object') {
        return {};
    }

    const extractNodeInfo = (path: string[]): ConfigNodeInfo | undefined => {
        const node = findNodeAtLocation(root, path);
        if (!node) {
            return undefined;
        }
        return {
            value: getNodeValue(node),
            offset: node.offset,
            length: node.length
        };
    };

    return {
        references: extractNodeInfo(['references']),
        include: extractNodeInfo(['include']),
        paths: extractNodeInfo(['compilerOptions', 'paths'])
    };
}

function getNodeValue(node: Node): any {
    if (node.type === 'array') {
        return node.children?.map(child => getNodeValue(child)) ?? [];
    }
    if (node.type === 'object') {
        const obj: Record<string, any> = {};
        node.children?.forEach(property => {
            if (property.type === 'property' && property.children && property.children.length === 2) {
                const key = property.children[0].value;
                const value = property.children[1];
                obj[key] = getNodeValue(value);
            }
        });
        return obj;
    }
    return node.value;
}