// Guest poll creation, off unless the instance opts in. Self-hosted
// instances can enable it too, so a deployment without email or SSO login
// still lets people create polls.
export const isQuickCreateEnabled = process.env.QUICK_CREATE_ENABLED === "true";
