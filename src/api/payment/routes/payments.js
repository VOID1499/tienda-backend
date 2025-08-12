'use strict';

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/payments/khipu",
      handler: "khipu.khipu",
      config: { auth: false },
    },
  ],
};