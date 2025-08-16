'use strict';
const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

module.exports = {
  async khipu(ctx) {
    const data = ctx.request.body.data;

    console.log(data)
    try {

      const metodoDeEnvio = await strapi.documents("api::metodos-de-envio.metodos-de-envio").findOne({
        documentId:data.envio.documentId
      })
      if(metodoDeEnvio.activo == false){
        throw new ApplicationError("Metodo de envio no activo",{ code:"SHIPPING_METHOD_NOT_ACTIVE"});
      }

      const metodoDePagoKhipu = await strapi.documents("api::metodos-de-pago.metodos-de-pago").findOne({
        documentId:data.pago.documentId 
      })

      if(metodoDePagoKhipu.activo == false){
        throw new ApplicationError("Metodo de pago no activo",{ code:"PAYMENT_METHOD_NOT_ACTIVE"});
      }

      const ordenCreada = await strapi.service("api::orden.orden").crearOrden(data,metodoDeEnvio,metodoDePagoKhipu);
      
      const response = await strapi.service("api::pasarelas.khipu").crearCobro(ordenCreada,metodoDePagoKhipu);

      await strapi.documents("api::orden.orden").update({
        documentId:ordenCreada.documentId,
        data:{
          "payment_id":response.payment_id
        },
        status:"published"
      })

      // Responder con la orden creada o mensaje OK
      ctx.body = {
            data: {
                ...response
            }
        };

    } catch (error) {

      console.log(error)
      if(error instanceof ApplicationError){
        ctx.status = 422;
        ctx.body = {
          data:{
            error: {
              message: error.message,
              details: error.details,
              code:error.details.code
            }
          }
        };
        return;
      }

      ctx.status = 500;
      ctx.body = {
        data:{
          error:{
            message:"Internal server error",
          }
        }
      }
    }
  },
};
