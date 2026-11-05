export const config = {
  whatsappNumero: '573233196941',
  whatsappMensaje:
    'Hola, vi el recorrido virtual de Aeronova Academy y quiero información para iniciar mi admisión.'
} as const;

export const whatsappUrl = `https://wa.me/${config.whatsappNumero}?text=${encodeURIComponent(config.whatsappMensaje)}`;
