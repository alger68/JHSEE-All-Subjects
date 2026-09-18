const topSkills=(skills={})=>Object.values(skills)
  .sort((a,b)=>(b.priorityScore??0)-(a.priorityScore??0))
  .slice(0,5)
  .map(({subject,domain,competency,mastery,priorityScore})=>({subject,domain,competency,mastery,priorityScore}));

export function cycleArchiveSnapshot(state,today){
  return {
    cycle:state.currentLearningCycle??1,
    endedAt:today,
    answered:state.player?.totalAnswered??0,
    attempts:(state.attempts??[]).length,
    openWrong:(state.wrongQuestions??[]).filter(item=>!item.resolved).length,
    subjectWeights:state.adaptiveSubjectWeights??null,
    topSkills:topSkills(state.adaptiveSkills)
  };
}

export function createAdaptiveReset(state){
  return {
    ...state,
    adaptiveSkills:{},
    answerHistory:[],
    adaptiveSubjectWeights:null,
    generatedQuestions:[],
    adaptiveSnapshots:[],
    aiUsage:null,
    activeRun:null,
    activeExam:null
  };
}

export function createNewLearningCycle(state,today){
  const archive=cycleArchiveSnapshot(state,today);
  const reset=createAdaptiveReset(state);
  return {
    ...reset,
    learningCycles:[...(state.learningCycles??[]),archive].slice(-12),
    currentLearningCycle:(state.currentLearningCycle??1)+1,
    cycleStartedAt:today
  };
}
