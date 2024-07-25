export const routeGroups = {
  auth: ["/privacy", "/signin", "/tos"],
  canvas: ["/canvas"],
  dash: ["/memories", "/space", "/chat", "/home", "/note"],
  landing: ["/"],
  other: ["/ref", "/onboarding"],
};

export const routeTypes = {
  authed: [...routeGroups.canvas, ...routeGroups.dash, ...routeGroups.other],
  unauthed: [...routeGroups.auth, ...routeGroups.landing],
}