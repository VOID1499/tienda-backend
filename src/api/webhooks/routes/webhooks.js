'use strict';

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/webhooks/khipu",
      handler: "webhooks.khipu",
      config: { auth: false },
    },
  ],
};