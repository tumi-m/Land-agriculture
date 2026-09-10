/** Public NGI imagery service also catalogued by the Western Cape government.
 * Aerial capture dates vary; pixelSize in service metadata is not a capture-date or accuracy guarantee.
 */
export const AERIAL_SERVICE =
  "https://imagery.esri-southafrica.com/server/rest/services/NGI/RSA_NGI_AERIAL/ImageServer";
export const AERIAL_CATALOGUE =
  "https://gis.westerncape.gov.za/portal/home/item.html?id=8cc0011a592245919f08ae86d955ec55";
export const AERIAL_TILES = `${AERIAL_SERVICE}/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&interpolation=RSP_BilinearInterpolation&f=image`;
export const AERIAL_ATTRIBUTION = `<a href="${AERIAL_CATALOGUE}">Aerial imagery: NGI via Esri South Africa · capture dates vary</a>`;
