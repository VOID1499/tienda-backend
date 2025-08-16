'use strict';

/**
 * orden service
 */
const toIsoWithTimezone = require("../../../utils/formatDateToIso.js");
const { calcularTotales ,calcularVolumenYPeso} = require("../../../utils/caculosDeOrden.js");
const { errors } = require('@strapi/utils');
const orden = require("../controllers/orden.js");
const { ApplicationError } = errors;
const { createCoreService } = require('@strapi/strapi').factories;
module.exports = createCoreService('api::orden.orden', ({ strapi }) => ({


  async crearOrden(data,metodoDeEnvio,metodoDePago){

    const { productos, orden,envio,pago } = data;

    
    //consultar schema de producto
    const schemaProducto = strapi.contentTypes["api::producto.producto"];
    const atributosRelacion = Object.entries(schemaProducto.attributes)
      .filter(([key, value]) => key.startsWith("attr") && value.type === "relation")
      .map(([key]) => key);

    const populateAttrs = atributosRelacion.reduce((acc, attr) => {
      acc[attr] = true;
      return acc;
    }, {});

    // Validación de productos en paralelo
    const productosValidados = await Promise.all(productos.map(async (item) => {
      const { cantidad, producto } = item;
      const productoActual = await strapi.documents("api::producto.producto").findOne({
        documentId: producto.documentId,
        status: "published",
        populate:{
          ...populateAttrs,
          dimension:true,
          producto:{
            populate:["dimension"]
          }
        },
      });

      // se añade el error a productos sin stock o inexistente
      if (!productoActual) {
        return {
          error: {
            documentId: producto.documentId,
            motivo: "Producto no encontrado"
          }
        };
      }
      
      //añade valores del producto padre al hijo si son necesarios
      if (productoActual.tipo == null) {
        productoActual.precio = productoActual.precio !== 0 ? productoActual.precio: productoActual.producto?.precio;
        productoActual.dimension = productoActual.producto?.dimension; 
        const descuento_ = productoActual.descuento_porcentaje == null? (productoActual.producto?.descuento_porcentaje ?? 0): productoActual.descuento_porcentaje;
        productoActual.descuento_porcentaje = descuento_;

         const info = atributosRelacion.reduce((acc, attr, index) => {
            const limpio = attr.replace('attr_', '');
            const valor = productoActual?.[attr]?.[limpio] || '';
            return acc + " " + valor
        }, '');
        productoActual.infoSnapshot = `${productoActual.producto.nombre} ${info}`
      }

      if(productoActual.tipo == "simple"){
        const info = atributosRelacion.reduce((acc, attr, index) => {
            const limpio = attr.replace('attr_', '');
            const valor = productoActual?.[attr]?.[limpio] || '';
            return acc + " " + valor
        }, '');
        productoActual.infoSnapshot = `${productoActual.nombre} ${info}`
      }

      //se añade el tipo de stock utilizado en el momento ficticio o real para posterior regeneracion de stock
      if (!productoActual.habilitar_stock) {
        return {
          ok: {
            cantidad,
            productoActual: {
              ...productoActual,
              stock_ficticio: true
            }
          }
        };
      }

      // retorna un producto sin stock
      if (productoActual.stock_disponible < cantidad) {
        return {
          error: {
            documentId: producto.documentId,
            motivo: "Stock insuficiente",
            stock_disponible: productoActual.stock_disponible,
            solicitado: cantidad
          }
        };
      }

      //retorna el producto satisfactoriamente 
      return {
        ok: {
          cantidad,
          productoActual: {
            ...productoActual,
            stock_ficticio: false
          }
        }
      };
    }));

    const productosParaDetalleOden = [];
    const productosSinStock = [];

    // si el producto arrojo un error como sin stock o no encontrado se añade a productos sin stock 
    for (const resultado of productosValidados) {
      if (resultado.error) {
        productosSinStock.push(resultado.error);
      } else {
        productosParaDetalleOden.push(resultado.ok);
      }
    }

    // si se encontraro productos sin stock se lanza error 
    if (productosSinStock.length > 0) {
      throw new ApplicationError("Algunos productos no están disponibles", { 
        productosSinStock,
        code:"OUT_OF_STOCK"
      });
    
    }

    // Calculos de orden

     const {volumenTotalCm3, volumenTotalLitros,pesoTotalKg }  = calcularVolumenYPeso(productosParaDetalleOden)
     const { subtotalSinDescuento, totalConDescuento,descuentoTotal}  = calcularTotales(productosParaDetalleOden)
     let costo_envio = 0;
     if(metodoDeEnvio.tarifa_fija != null){
      costo_envio = metodoDeEnvio.tarifa_fija;
     }


    let ordenCreada;

    try {
      await strapi.db.transaction(async ({ trx, onRollback }) => {
        onRollback(() => {
          console.log("Transacción fallida, rollback aplicado");
        });

        // 1. Actualizar stock
        for (const { cantidad, productoActual } of productosParaDetalleOden) {
          if (!productoActual.stock_ficticio) {
            await trx('productos')
              .where({ document_id: productoActual.documentId })
              .update({
                stock_disponible: productoActual.stock_disponible - cantidad,
                stock_reservado: productoActual.stock_reservado + cantidad,
                updated_at: new Date(),
              });
          }
        }
        
        // 2. Crear orden
        ordenCreada = await strapi.documents("api::orden.orden").create({
          data: {
            costo_envio,
            subtotal:subtotalSinDescuento,
            total: totalConDescuento,
            descuento:descuentoTotal,
            nombre: orden.nombre,
            apellidos: orden.apellidos,
            email: orden.email,
            telefono: orden.telefono,
            direccion: orden.direccion,
            metodos_de_pago: {
              connect: { documentId: metodoDePago.documentId }
            }
          },
          transacting: trx,
        });



        // 3. Crear detalles
        for (const item of productosParaDetalleOden) {
          await strapi.documents("api::orden-detalle.orden-detalle").create({
            data: {
              cantidad: item.cantidad,
              precio: item.productoActual.precio,
              subtotal: item.cantidad * item.productoActual.precio,
              orden: ordenCreada.documentId,
              producto: item.productoActual.documentId,
              stock_ficticio: item.productoActual.stock_ficticio === true,
              snapshot_info_producto: item.productoActual.infoSnapshot,
            },
            transacting: trx,
          });
        }
      });
    } catch (error) {
      console.log(error)
      throw new ApplicationError("Error al crear la orden y sus detalles");
    }

    return ordenCreada;
 
  },

  
  async cambiarEstadoOrden(documentId,estado){

    try {
      await strapi.db.transaction(async ({ onCommit, onRollback }) => {

          const ordenEncontrada = await strapi.documents("api::orden.orden").findOne({
            documentId:documentId
          })
      
          const detallesOrdenConStockReal = await strapi.documents("api::orden-detalle.orden-detalle").findMany({
              filters:{
                stock_ficticio:false,
                orden: {
                  documentId: documentId,
                },
              },
              populate:{
                producto:{
                  fields:["documentId","stock_disponible","stock_total","stock_reservado"]
                }
              }
          });
          

            if (
              (estado === "pagada" && ordenEncontrada.estado === "pendiente") ||
              (estado === "cancelada" && ordenEncontrada.estado === "pendiente") ||
              (estado === "enviada" && ordenEncontrada.estado === "pagada")
            ) {
              await strapi.documents("api::orden.orden").update({
                documentId,
                data: { estado }
              });
            }
            
            if(estado == "pagada" && ordenEncontrada.estado == "pendiente"){
         
            }

            if(estado == "cancelada" && ordenEncontrada.estado == "pendiente"){
          
              for(const detalle of detallesOrdenConStockReal){
                  const stock_disponible = detalle.producto.stock_disponible + detalle.cantidad;
                  const stock_reservado = detalle.producto.stock_reservado - detalle.cantidad;
                  await strapi.documents("api::producto.producto").update({
                    documentId:detalle.producto.documentId,
                    data:{
                      stock_disponible:stock_disponible,
                      stock_reservado:stock_reservado,
                    },
                    status:"published"
                  })
              }
            }

            if(estado == "enviada" && ordenEncontrada.estado == "pagada"){
            
              for(const detalle of detallesOrdenConStockReal){
                const stock_reservado = detalle.producto.stock_reservado - detalle.cantidad;
                const stock_total = stock_reservado + detalle.producto.stock_disponible;
                await strapi.documents("api::producto.producto").update({
                  documentId:detalle.producto.documentId,
                  data:{
                    stock_total:stock_total,
                    stock_reservado:stock_reservado,
                  },
                  status:"published"
                })
            }
            }


          onCommit(() => {
          });
          
          onRollback(() => {
            console.log("Se aplica rollback");
          });

        });
    }catch (error) {
      console.log(error)
      throw new ApplicationError("Error al actualizar el estado de la orden",{error});
    }

  },


  async eliminarOrdenesPendientes(){

    try {
          const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // utc
          const haceUnMinuto = new Date(Date.now() - 1 * 60 * 1000).toISOString();

         // 1. Buscar órdenes pendientes
          const ordenesPendientes = await strapi.documents("api::orden.orden").findMany({
            filters: { 
              estado: "pendiente",
              createdAt:{
                $lte:haceUnMinuto
              }
               
            },
            populate: { 
              metodos_de_pago: true,
            }
          });

          const responses = await Promise.allSettled(
             ordenesPendientes.map((orden) =>
               strapi.service("api::pasarelas.payment-dispatcher").verificarEstadoDeCobro(orden)
             )
           );

          const ordenesConEstadoDeCobroReal = responses
          .map((res, i) => ({ res, orden: ordenesPendientes[i] }))
          .filter(({ res }) => res.status === "fulfilled")
          .map(({ orden ,res}) =>{
            return { orden, res}
          });

          
          for(const item of ordenesConEstadoDeCobroReal){

            //cobro real pendiente -> se cancela el cobro real y la orden queda candelada
            if(item.res.value == "pending"){
             await strapi.service("api::pasarelas.payment-dispatcher").cancelarCobro(item.orden); 
             await this.cambiarEstadoOrden(item.orden.documentId,"cancelada");
            }

            //cobro real cancelado
            if(item.res.value == "canceled"){
             await this.cambiarEstadoOrden(item.orden.documentId,"cancelada");
            }

            //cobro real pagado
            if(item.res.value == "done"){
             await this.cambiarEstadoOrden(item.orden.documentId,"pagada")
            }

          
          }  


    }catch (error) {
      throw new ApplicationError("Error al eliminar ordenes pendientes",{error});
    }

  }




}));

