const orden = require("../../orden/controllers/orden");
const { cancelarCobro } = require("./khipu");

module.exports = ({ strapi }) => {
  // Defino providers una vez cuando se crea el servicio
  const providers = {
    Khipu: strapi.service("api::pasarelas.khipu"),
    // otros proveedores
  };

  return {

    async verificarEstadoDeCobro(orden) {
      if (!orden.metodos_de_pago) {
        throw new Error(`La orden ${orden.id} no tiene método de pago asignado`);
      }

      const metodo = orden.metodos_de_pago.nombre.trim();
      console.log(`Buscando proveedor para método: "${metodo}"`);

      const provider = providers[metodo];
      if (!provider) {
        throw new Error(`Proveedor de pago desconocido: ${metodo}`);
      }

      return await provider.verificarEstadoDeCobro(orden);
    },

    async cancelarCobro(orden){
     
      if (!orden.metodos_de_pago) {
        throw new Error(`La orden ${orden.id} no tiene método de pago asignado`);
      }

      const metodo = orden.metodos_de_pago.nombre.trim();
      console.log(`Buscando proveedor para método: "${metodo}"`);

      const provider = providers[metodo];
      if (!provider) {
        throw new Error(`Proveedor de pago desconocido: ${metodo}`);
      }
      return await provider.cancelarCobro(orden);
      
    }

  };
};