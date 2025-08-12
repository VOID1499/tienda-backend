'use strict';
const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

module.exports = {
  
  async khipu(ctx) {
    const signature = ctx.request.header['x-khipu-signature'];
    const payload = ctx.request.body;

    const transactionId = ctx.request.body.data.documentId;
    
    try {
      
      await strapi.service("api::orden.orden").cambiarEstadoOrden(transactionId,"pagada");

      //204 no content
      ctx.send();
      
    } catch (error) {
      console.log(error)
      if(error instanceof ApplicationError){
        ctx.status = 422;
        ctx.body = {
          data:{
            error: {
              message: error.message,
              detalles: error.details,
            }
          }
        };
        return;
      }
    }

    

  },

 
};