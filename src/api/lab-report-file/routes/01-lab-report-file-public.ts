export default {
  routes: [
    {
      method: "POST",
      path: "/lab-report-files/staff-login",
      handler: "lab-report-file.staffLogin",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/lab-report-files/download",
      handler: "lab-report-file.download",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/lab-report-files/upload",
      handler: "lab-report-file.upload",
      config: {
        auth: {
          scope: ["api::lab-report-file.lab-report-file.upload"],
        },
        policies: [],
        middlewares: [],
      },
    },
  ],
};
