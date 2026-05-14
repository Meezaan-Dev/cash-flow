import { useCallback } from 'react';
import { apiService } from '@/services/api';
import { AskAIRequest } from '@/types';

interface AIChatControllerReturn {
	askQuestion: (payload: AskAIRequest) => Promise<string>;
}

export const useAIChatController = (): AIChatControllerReturn => {
	const askQuestion = useCallback(async (payload: AskAIRequest) => {
		const response = await apiService.askAI(payload);
		return response.answer;
	}, []);

	return { askQuestion };
};
