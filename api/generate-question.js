import { createGenerateQuestionHandler } from './lib/generate-handler.js';

const liveHandler=createGenerateQuestionHandler();

export default {
  fetch(request) {
    return liveHandler(request);
  }
};
