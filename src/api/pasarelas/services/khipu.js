const toIsoWithTimezone = require("../../../utils/formatDateToIso.js");
const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

module.exports = {

  
  async crearCobro(ordenCreada,khipuConfig) {

    const apiKey = khipuConfig.configuracion.apiKey;
    const url = `${khipuConfig.configuracion.apiUrl}/payments`;

    /*
    const now = new Date();
    const expiresDatekhipu = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos más
    const expires_date_khipu = toIsoWithTimezone(expiresDatekhipu);
     */
    

    // Luego usarlo en el objeto data:
    const data = {
      amount: ordenCreada.subtotal,
      currency: "CLP",
      subject: `Orden ID ${ordenCreada.documentId}`,
      transaction_id: ordenCreada.documentId,
      body: `Cobro de orden de compra #${ordenCreada.id}`,
      return_url: khipuConfig.configuracion.return_url,
      cancel_url: khipuConfig.configuracion.cancel_url,
      picture_url: khipuConfig.configuracion.picture_url,
      notify_url:khipuConfig.configuracion.notify_url,
      notify_api_version: "3.0",
      send_email: true,
      payer_name: `${ordenCreada.nombre} ${ordenCreada.apellidos}`,
      payer_email: ordenCreada.email,
      send_reminders: true,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          'x-api-key': apiKey,
          'Content-Type': "application/json",
          "Accept":"*/*",
        },
        body:JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error Khipu: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      return responseData;

    } catch (error) {
      console.error("Error creando cobro Khipu:", error);
      throw error; // para que el error se propague
    }
  },


  
    async verificarEstadoDeCobro(orden) {

      if(!orden.payment_id){
        throw new ApplicationError("No se encontro el id de cobro");
      }

      const apiKey = orden.metodos_de_pago.configuracion.apiKey;
      const url = `${orden.metodos_de_pago.configuracion.apiUrl}/payments/${orden.payment_id}`;
      
      try {
        const response = await fetch(url, {
        method: "GET",
        headers: {
          'x-api-key': apiKey,
          'Content-Type': "application/json",
          "Accept":"*/*",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error Khipu: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();

      if(responseData){
        return responseData.status == "pending" ? true : false;
      }

      return false; 

      } catch (error) {
        console.error("Error consultando el estado de un cobro", error);
        throw error; // para que el error se propague
      }
      
    },




     async cancelarCobro(orden) {

      const apiKey = orden.metodos_de_pago.configuracion.apiKey;
      const url = `${orden.metodos_de_pago.configuracion.apiUrl}/payments/6hjuk8pjf1uh`;
      
      try {
        const response = await fetch(url, {
        method: "DELETE",
        headers: {
          'x-api-key': apiKey,
          'Content-Type': "application/json",
          "Accept":"*/*",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error Khipu: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log(responseData);

      } catch (error) {
        console.error("Error eliminando cobro", error);
        throw error; // para que el error se propague
      }
      
    }

};
