// src/agent.ts
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { DynamicTool } from '@langchain/core/tools';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';

dotenv.config();

export class AssistantAgent {
  private model: ChatOpenAI;
  private tools: DynamicTool[];
  private executor: AgentExecutor | null = null;
  private chatHistory: (AIMessage | HumanMessage)[] = [];

  constructor() {
    this.model = new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.tools = [
      new DynamicTool({
        name: 'getCurrentTime',
        description: '获取当前时间的工具',
        func: async () => new Date().toLocaleString(),
      }),
      new DynamicTool({
        name: 'getRandomNumber',
        description: '生成1到100之间的随机数',
        func: async () => Math.floor(Math.random() * 100 + 1).toString(),
      }),
    ];
  }

  private getToolDescriptions(): string {
    return this.tools
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join('\n');
  }

  private createPrompt(): ChatPromptTemplate {
    const systemTemplate = `你是一个有帮助的AI助手，可以使用各种工具来帮助用户。
        
                            当你需要使用工具时，请按照以下格式思考：
                            1. 工具: 需要使用什么工具？
                            2. 工具输入: 给这个工具什么输入？
                            3. 观察: 工具返回了什么？
                            4. 思考: 我应该做什么？

                            可用的工具有:
                            {tool_descriptions}

                            请记住:
                            - 使用工具时要仔细检查输入格式
                            - 总是用中文回复用户
                            - 如果不需要使用工具，直接回答用户问题
                            - 保持回答简洁明了`;

    return ChatPromptTemplate.fromMessages([
      ['system', systemTemplate],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);
  }

  async initialize(): Promise<void> {
    try {
      const prompt = this.createPrompt();

      const agent = await createOpenAIFunctionsAgent({
        llm: this.model,
        tools: this.tools,
        prompt: await prompt.partial({
          tool_descriptions: this.getToolDescriptions(),
        }),
      });

      this.executor = new AgentExecutor({
        agent,
        tools: this.tools,
        verbose: false,
      });
    } catch (error) {
      console.error('Agent initialization failed:', error);
      throw new Error('Failed to initialize agent');
    }
  }

  async query(input: string): Promise<string> {
    if (!this.executor) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      // 将用户输入添加到聊天历史
      this.chatHistory.push(new HumanMessage(input));

      // 执行查询并返回结果
      const result = await this.executor.invoke({
        input,
        chat_history: this.chatHistory,
      });

      // 将AI响应添加到聊天历史
      this.chatHistory.push(new AIMessage(result.output));

      return result.output;
    } catch (error) {
      console.error('Error executing agent query:', error);
      throw new Error('Query execution failed');
    }
  }

  // 清除聊天历史
  clearHistory(): void {
    this.chatHistory = [];
  }
}

async function main() {
  try {
    const agent = new AssistantAgent();
    await agent.initialize();

    const queries = [
      '现在几点了？',
      '给我一个1到100之间的随机数',
      '你能帮我写代码吗？',
      '写一个JavaScript冒泡排序',
    ];

    for (const query of queries) {
      console.log(`\n问题: ${query}`);
      const result = await agent.query(query);
      console.log('回答:🍊🍊🍊🍊🍊🍊', result);
    }
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main();
