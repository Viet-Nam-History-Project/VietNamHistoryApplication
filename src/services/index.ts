/**
 * Export tất cả các services từ một nơi
 */

// Firebase config
export { app, auth, db, firebaseConfig } from './firebase';

// Authentication services
export {
  loginWithUsername,
  register,
  logout,
  resetPassword,
} from './authService';

// Data services
export {
  getPeriods,
  getPeriodBySlug,
  getPeriodById,
} from './periodService';

export {
  getStagesByPeriod,
  getStageById,
} from './stageService';

export {
  getEventsByStage,
  getEventById,
  getEventsByPeriod,
} from './eventService';

export {
  getPersonPeriods,
  getPersonsByPeriod,
  getPersonDetail,
  getPersonEvents,
  getPersonEventDetail,
} from './personService';

export {
  getQuizzes,
  getQuizById,
  getQuestionsByQuiz,
} from './quizService';



export {
  getUserById,
  updateUser,
  addFinishedQuiz,
  addUserBadge,
  updateLastLogin,
  uploadUserAvatar,
} from './userService';

export {
  getUserSession,
  saveUserSession,
  clearUserSession,
  USER_SESSION_KEY,
} from './userSession';

// Gamification services
export { calculateXP } from './xpService';
export {
  RANK_TIERS,
  getRankForXP,
  getRankTier,
  getNextRankInfo,
  getRankProgress,
} from './rankService';
export { BADGE_DEFINITIONS, getBadgeDefinition, checkNewBadges } from './badgeService';
export { calculateStreak, getTodayVietnam } from './streakService';
export { logGameSession, getUserGamificationProfile, getUserPlayHistory } from './gamificationService';

// AI history assistant
export { askHistoryAi } from './chatAiService';
export type {
  ChatAiResponse,
  ChatCitation,
  ChatHistoryMessage,
} from './chatAiService';

// Forum services
export {
  getForumPosts,
  getForumPost,
  toggleLike,
  subscribeToReplies,
  addReply,
  createPost,
  createForumReport,
  FORUM_REPORT_REASONS,
} from './forumService';
