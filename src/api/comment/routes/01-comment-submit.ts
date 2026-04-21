export default {
  routes: [
    {
      method: "GET",
      path: "/comments/approved",
      handler: "comment.approvedList",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/comments/submit",
      handler: "comment.submit",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
