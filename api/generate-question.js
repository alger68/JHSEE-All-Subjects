import { createGenerateQuestionHandler } from './lib/generate-handler.js';

let liveHandler;

export default {
  fetch(request) {
    if (!liveHandler) {
      liveHandler=createGenerateQuestionHandler({
        fetchImpl: globalThis.fetch,
        env: globalThis.process?.env ?? {}
      });
    }
    return liveHandler(request);
  }
};
