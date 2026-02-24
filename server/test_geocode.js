const { getLatLng } = require('./routes/autoAssign');

(async () => {
  try {
    const address = process.argv[2] || 'Sector 17, Chandigarh';
    console.log('Testing geocode for:', address);
    const coords = await getLatLng(address);
    if (!coords) {
      console.error('Geocoding returned null (unable to geocode)');
      process.exitCode = 2;
      return;
    }
    console.log('Geocode result:', coords);
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  }
})();




