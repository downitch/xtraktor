import { execSync } from 'child_process';
import ollama from 'ollama';

export function isOllamaUp() {
  try {
    execSync('lsof -i :11434');
    console.log("Ollama is up and running, let's use some AI");
    return true;
  } catch(error) {
    console.error("Your local instance of Ollama isn't running on port :11434. Please, fix this before proceeding.");
    return false;
  }
};

export async function ollamaRequest(prompt, slop) {
  const response = await ollama.chat({
      model: 'gpt-oss',
      messages: [
          {
              role: 'user', 
              content: `${prompt}${slop}`,
              options: {
                'num_ctx': 16384
              }
          }
      ],
  });
  return response.message.content;
};