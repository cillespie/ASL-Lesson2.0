import { ai } from '../genkit';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.GITHUB_OWNER!;
const repo = process.env.GITHUB_REPO!;

// Search code tool
export const searchGitHubCodeTool = ai.defineTool(
  {
    name: 'search_github_code',
    description: 'Search code in the GitHub repository. Use for finding files, functions, or troubleshooting.',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        path: z.string(),
        snippet: z.string(),
      })),
    }),
  },
  async (input) => {
    const { data } = await octokit.search.code({
      q: `${input.query} repo:${owner}/${repo}`,
    });

    return {
      results: data.items.slice(0, 5).map(item => ({
        path: item.path,
        snippet: item.text_matches?.[0]?.fragment || '',
      })),
    };
  }
);

// Get file contents tool
export const getGitHubFileTool = ai.defineTool(
  {
    name: 'get_github_file',
    description: 'Read file contents from GitHub repository.',
    inputSchema: z.object({
      path: z.string().describe('File path in repository'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: input.path,
    });

    if ('content' in data) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    throw new Error('File not found or is a directory');
  }
);

// Create pull request tool
export const createPullRequestTool = ai.defineTool(
  {
    name: 'create_pull_request',
    description: 'Create a pull request with code fixes. Use after identifying and fixing bugs.',
    inputSchema: z.object({
      branchName: z.string().describe('New branch name (e.g., "fix/missing-import")'),
      title: z.string().describe('PR title'),
      body: z.string().describe('PR description'),
      files: z.array(z.object({
        path: z.string(),
        content: z.string(),
      })).describe('Files to update'),
    }),
    outputSchema: z.object({
      prNumber: z.number(),
      prUrl: z.string(),
    }),
  },
  async (input) => {
    // Get default branch SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });

    // Create new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${input.branchName}`,
      sha: ref.object.sha,
    });

    // Update files
    for (const file of input.files) {
      const { data: currentFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
        ref: input.branchName,
      });

      if ('sha' in currentFile) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: `Fix: ${input.title}`,
          content: Buffer.from(file.content).toString('base64'),
          sha: currentFile.sha,
          branch: input.branchName,
        });
      }
    }

    // Create PR
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: input.title,
      body: input.body,
      head: input.branchName,
      base: 'main',
    });

    return {
      prNumber: pr.number,
      prUrl: pr.html_url,
    };
  }
);
