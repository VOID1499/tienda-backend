const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

module.exports = {


  myJob: {
    task: async ({ strapi }) => {
      try {
        await strapi.service("api::orden.orden").eliminarOrdenesPendientes();
      } catch (error) {
        if(error instanceof ApplicationError){
          console.log(error.details)
        }
      }
    },
    options: {
      rule: "*/5 * * * * *",
    },
  },
};