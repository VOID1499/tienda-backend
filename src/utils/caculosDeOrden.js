
function calcularVolumenYPeso(items) {
  let volumenTotalCm3 = 0;
  let pesoTotalKg = 0;

  for (const item of items) {
    const dimension = item.productoActual.dimension;
    if (!dimension) continue;

    const { largo, ancho, alto, peso } = dimension;

    // Volumen de una unidad (cm³)
    const volumenUnidad = largo * ancho * alto;

    // Sumar volumen total considerando cantidad
    volumenTotalCm3 += volumenUnidad * item.cantidad;

    // Sumar peso total considerando cantidad
    pesoTotalKg += peso * item.cantidad;
  }

  return {
    volumenTotalCm3, // volumen total en centímetros cúbicos
    volumenTotalLitros: volumenTotalCm3 / 1000, // volumen en litros
    pesoTotalKg       // peso total en kilos
  };
}


function calcularTotales(items) {
  let subtotalSinDescuento = 0;
  let totalConDescuento = 0;
  let descuentoTotal = 0;

  for (const item of items) {
    const { precio, descuento_porcentaje } = item.productoActual;
    const cantidad = item.cantidad;

    // Subtotal sin descuentos
    const subtotalProducto = precio * cantidad;
    subtotalSinDescuento += subtotalProducto;

    // Calcular precio con descuento
    const descuentoAplicado = precio * (descuento_porcentaje / 100);
    const precioFinal = precio - descuentoAplicado;

    // Total producto con descuento
    const totalProducto = precioFinal * cantidad;
    totalConDescuento += totalProducto;

    // Acumular descuento total
    descuentoTotal += (subtotalProducto - totalProducto);
  }

  return {
    subtotalSinDescuento,
    totalConDescuento,
    descuentoTotal
  };
}



module.exports = {
  calcularVolumenYPeso,
  calcularTotales

}