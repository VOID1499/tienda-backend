 // Convertir a ISO 8601 con milisegundos y zona horaria local
    // Ejemplo: 2025-08-05T14:00:00.123-04:00

    function toIsoWithTimezone(date) {
      const pad = (n) => n.toString().padStart(2, '0');
      const padMs = (n) => n.toString().padStart(3, '0');

      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      const second = pad(date.getSeconds());
      const ms = padMs(date.getMilliseconds());

      // Obtener offset en minutos y convertir a +/-HH:mm
      const tzOffset = -date.getTimezoneOffset();
      const sign = tzOffset >= 0 ? '+' : '-';
      const tzHour = pad(Math.floor(Math.abs(tzOffset) / 60));
      const tzMin = pad(Math.abs(tzOffset) % 60);

      return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${sign}${tzHour}:${tzMin}`;
    }


module.exports = toIsoWithTimezone;