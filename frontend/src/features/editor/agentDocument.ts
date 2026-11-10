export type TaskMessage = {
    role: string;
    content: string;
};

export type EdgeField = {
    type?: string;
    description?: string;
    enum?: string[];
};

export type AgentEdge = {
    function: string;
    description: string;
    target: string;
    properties?: Record<string, EdgeField>;
    required?: string[];
};

export type AgentNode = {
    name: string;
    task_messages?: TaskMessage[];
    role_message?: string | null;
    edges?: AgentEdge[];
    pre_actions?: unknown[];
    post_actions?: unknown[];
    end?: boolean;
};

export type NodePosition = {
    x: number;
    y: number;
};

export type AgentDocument = {
    name: string;
    voice_id?: string;
    model?: string;
    persona?: string;
    initial_node: string;
    nodes: AgentNode[];
};

export type AgentSummary = {
    id: string;
    name: string;
};
