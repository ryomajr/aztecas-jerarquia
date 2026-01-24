// ------------------------------
// FUNCIONES PARA EL PANEL LATERAL
// ------------------------------
function openSidebar(descriptionUrl, markerName) {
  const sidebar = document.getElementById('sidebar');
  const sidebarContent = document.getElementById('sidebar-content');
  const sidebarHeader = document.querySelector('#sidebar-header h2');

  // Actualizar título del panel
  sidebarHeader.textContent = markerName;

  // Cargar el contenido HTML desde la URL
  if (descriptionUrl) {
    fetch(descriptionUrl)
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar el archivo');
        return res.text();
      })
      .then(html => {
        sidebarContent.innerHTML = html;
        sidebar.classList.add('open');
      })
      .catch(err => {
        console.error('Error cargando descripción:', err);
        sidebarContent.innerHTML = '<p>Error al cargar la información</p>';
        sidebar.classList.add('open');
      });
  } else {
    sidebarContent.innerHTML = '<p>Sin información disponible</p>';
    sidebar.classList.add('open');
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// Evento para cerrar el panel
document.getElementById('close-sidebar').addEventListener('click', closeSidebar);

// Cerrar panel al hacer click fuera de él
document.getElementById('map').addEventListener('click', function(e) {
  // No cerrar si se hace click en un marcador
  if (!e.target.closest('.leaflet-marker-icon')) {
    // closeSidebar(); // Opcional: descomenta si quieres cerrar al hacer click en el mapa
  }
});

const MAP_SIZE = 8192;

// Crear el mapa con CRS.Simple (coordenadas tipo pixel)
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -4,
  maxZoom: 2,
  zoomSnap: 0.50
});

// Límites del mapa
const bounds = [[0, 0], [MAP_SIZE, MAP_SIZE]];
map.fitBounds(bounds);      // Ajusta vista inicial
map.setMaxBounds(bounds);   // Bloquea movimiento fuera de la imagen

// Cargar la imagen del mapa
L.imageOverlay('img/mapa.jpg', bounds).addTo(map);

// Variable para almacenar el popup abierto
let currentPopup = null;

// ------------------------------
// CLICK PARA COPIAR COORDENADAS
// ------------------------------
map.on('click', function(e) {
    // Si hay un popup abierto, cerrarlo y salir
    if (currentPopup) {
      map.closePopup(currentPopup);
      currentPopup = null;
      return;
    }

    const lat = e.latlng.lat.toFixed(2);
    const lng = e.latlng.lng.toFixed(2);
    const coordText = `${lat}, ${lng}`;

    // Mostrar popup temporal
    currentPopup = L.popup()
      .setLatLng(e.latlng)
      .setContent(`<b>Coordenadas copiadas:</b><br>${coordText}`)
      .openOn(map);

    // Copiar al portapapeles
    navigator.clipboard.writeText(coordText)
      .then(() => console.log(`Coordenadas copiadas: ${coordText}`))
      .catch(err => console.error('Error al copiar:', err));
});

// Objeto para almacenar layers dinámicamente
let layers = {};

// Función para convertir tipo a etiqueta legible (ej: "zona-peligro" -> "Zona peligro")
function typeToLabel(type) {
  return type
    .replace(/-/g, ' ')  // Reemplazar guiones por espacios
    .charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
}

// Función para generar layers automáticamente basado en markers.json
function generateLayersFromMarkers(markersData) {
  const uniqueTypes = new Set();
  
  // Obtener todos los tipos únicos de marcadores
  markersData.forEach(marker => {
    uniqueTypes.add(marker.type);
  });
  
  // Crear un layer para cada tipo
  const overlayMaps = {};
  uniqueTypes.forEach(type => {
    layers[type] = L.layerGroup().addTo(map);
    overlayMaps[typeToLabel(type)] = layers[type];
  });
  
  // Agregar control de capas
  L.control.layers(null, overlayMaps, { collapsed: false, position: 'bottomleft' }).addTo(map);
}

// ------------------------------
// CARGAR MARCADORES DESDE JSON
// ------------------------------
fetch('markers.json')
  .then(res => res.json())
  .then(data => {
    // Generar layers automáticamente
    generateLayersFromMarkers(data);
    
    // Cargar marcadores
    data.forEach(marker => {
      // Crear icono personalizado de 24x24 px usando iconUrl del JSON
      const icon = L.icon({
        iconUrl: marker.iconUrl,
        iconSize: [24, 24],         // tamaño exacto de tus iconos
        iconAnchor: [12, 12],       // punto de anclaje al píxel central inferior
        popupAnchor: [0, -24],      // posición del popup encima del icono
      });

      // Crear marcador
      const lMarker = L.marker([marker.lat, marker.lng], { icon: icon })
        .bindPopup(`<b>${marker.name}</b><br>${marker.description}`);

      // Agregar evento click para abrir el panel lateral
      lMarker.on('click', function() {
        openSidebar(marker.descriptionUrl, marker.name);
      });

      // Añadir al grupo correspondiente
      // Para tipos de recolecta, mapear el nombre al grupo correspondiente
      let targetLayer = null;
      if (marker.type === 'recolectaGominolas') targetLayer = recolectaLayers.gominolas;
      else if (marker.type === 'recolectaCigarros') targetLayer = recolectaLayers.cigarros;
      else if (marker.type === 'recolectaHarina') targetLayer = recolectaLayers.harina;
      else if (layers[marker.type]) targetLayer = layers[marker.type];
      
      if (targetLayer) {
        lMarker.addTo(targetLayer);
      } else {
        lMarker.addTo(map);
      }
    });
  })
  .catch(err => console.error('Error cargando markers.json:', err));