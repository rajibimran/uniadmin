export default {
  routes: [
    {
      method: "GET",
      path: "/booking-requests/availability",
      handler: "booking-request.availability",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/booking-requests/submit",
      handler: "booking-request.submit",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
