const geoInvasives = document.getElementById('js-geo-invasives');
const idSpecies = document.getElementById('js-identified-species');
const headers = new Headers();
const reader = new FileReader();
const imageForm = document.getElementById('js-image-form');
const imageField = document.getElementById('js-geo-image');
const encodedField = document.getElementById('js-encoded-image');
// setting default lat, lng, and countryCode
let lat = 49.207;
let lng = 16.608;

// Function to convert image to Base64
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

imageForm.addEventListener('submit', onFormSubmit);

// Event listener for file input change

imageField.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const base64String = await imageToBase64(file);
      encodedField.value = base64String;
    } catch (error) {
      console.error('Error converting image to Base64:', error);
    }
  }
})

function buildGeoInvasiveHTML(speciesobj) {
    let builtHTML = '';
    let cleanCommonNames;
    let cleanEdibleParts;
    for (let speciesnum in speciesobj) {
        let speciesName = speciesobj[speciesnum].properties.Name.rich_text[0].plain_text;
        let speciesImgSrc = speciesobj[speciesnum].properties.ImageURL.url;
        let speciesCommonNames = speciesobj[speciesnum].properties.CommonNames.rich_text[0].plain_text;
        let speciesEdibleParts = speciesobj[speciesnum].properties.EdibleParts.rich_text[0].plain_text;
        let recipeIdea = speciesobj[speciesnum].properties.EdibleOverride.url;
        cleanCommonNames = speciesCommonNames.replace(/"/g,'');
        cleanCommonNames = cleanCommonNames.replace('[{Name:','');
        cleanCommonNames = cleanCommonNames.replace('{Name:','');
        cleanCommonNames = cleanCommonNames.replace('{Name:','');
        cleanCommonNames = cleanCommonNames.replace('}]','');
        cleanCommonNames = cleanCommonNames.replace(/}/g,'');
        cleanCommonNames = cleanCommonNames.replace(/\[(\d+)\]/g,'');
        cleanEdibleParts = speciesEdibleParts.replace(/"/g,'');
        builtHTML += `<div class="species"><div><div class="species-img"><img src="` + speciesImgSrc + `" /></div><h3>` +  speciesName + `</h3><p class="common-names"><span class="label">Common name(s): </span>` + cleanCommonNames + `</p><p class="edible-parts"><span class="label">Edible parts: </span>` + cleanEdibleParts + `</p></div><p class="recipe-idea"><a target="_blank" href="` + recipeIdea + `">Recipe Idea</a></p></div>`
    }

    geoInvasives.innerHTML = builtHTML;
}

function buildIdentifiedSpeciesHTML(idobj) {
  let builtHTML = '';
  let cleanCommonNames;
  let cleanEdibleParts;
  let isInvasiveMsg;
  let isInvasive = idobj.invasiveDBResult;
  console.log(isInvasive);
  let speciesName = idobj.speciesName;
  let speciesImgSrc = idobj.speciesImgUrl;
  let speciesCommonNames = idobj.speciesCommonNames.toString();
  let speciesEdibleParts = idobj.speciesEdibleParts;
  let probability = (idobj.probability * 100);
  if (speciesEdibleParts == null || speciesEdibleParts == 'null') {
    cleanEdibleParts = "No, not edible";
  } else {
    speciesEdibleParts = speciesEdibleParts.replace(/,/g,", ");
    cleanEdibleParts = "Yes, you can eat the " + speciesEdibleParts;
  }
  if (isInvasive == '' || isInvasive == null || isInvasive == 'null') {
    isInvasiveMsg = "No, this is not invasive in your area."
  } else {
    isInvasiveMsg = "Yes, this is invasive in your area."
  }
  cleanCommonNames = speciesCommonNames.replace(/"/g,'').replace(/,/g,", ");
  builtHTML += `<div class="species"><div><div class="species-img"><img src="` + speciesImgSrc + `" /></div><h3>` +  speciesName + `</h3><p class="common-names"><span class="label">Common name(s): </span>` + cleanCommonNames + `</p><p class="edible-parts"><span class="label">Is it edible? </span>` + cleanEdibleParts + `</p><p class="invasive-result"><span class="label">Is it invasive? </span>` + isInvasiveMsg + `</p></div><p class="probability">We are <span class="label">` + probability + `%</span> sure of this species match!</p></div>`

  idSpecies.innerHTML = builtHTML;
}

async function geoInvasiveAPI(lat,long) {
  geoInvasives.innerHTML = `<p class="location-pending loading">Fetching invasive species near you...</p>`
    const response = await fetch("https://eowfpt9eurpvfo6.m.pipedream.net", {
        method: 'POST',
        body: new URLSearchParams({
        "latitude": lat,
        "longitude": long
        }),
        error: function (status) {
            saveStatus.innerText = 'Something went wrong. Please retry.';
            alert('fail' + status.code);
        }
    })
    const eiResponse = await response.json();
    geoInvasives.innerHTML = ``;
    buildGeoInvasiveHTML(Object.values(eiResponse)[1]);
}

async function identifyInvasive(IDimg, lat, lng) {
  idSpecies.innerHTML = `<p class="id-pending loading">Identifying this plant...</p>`
  const response = await fetch("https://eoi89k7q5g5lvhg.m.pipedream.net", {
      method: 'POST',
      body: new URLSearchParams({
      "image": IDimg,
      "lat": lat,
      "lng": lng
      }),
      error: function (status) {
          saveStatus.innerText = 'Something went wrong. Please retry.';
          alert('fail' + status.code);
      },
  })
  const idResponse = await response.json();
  console.debug(idResponse);
  buildIdentifiedSpeciesHTML(idResponse);
}

// Check if geolocation is supported by the browser
if ("geolocation" in navigator) {
  // Prompt user for permission to access their location
  navigator.geolocation.getCurrentPosition(
    // Success callback function
    (position) => {
      // Get the user's latitude and longitude coordinates
      lat = position.coords.latitude;
      lng = position.coords.longitude;

      // call geo function to retrieve invasives nearby
      geoInvasiveAPI(lat, lng);
      console.debug(`Latitude: ${lat}, longitude: ${lng}`);
    },
    // Error callback function
    (error) => {
      // Handle errors, e.g. user denied location sharing permissions

      geoInvasives.innerHTML = `<p class="location-blocked">Could not access your location.</p>`
      console.error("Error getting user location:", error);
    }
  );
} else {
  // Geolocation is not supported by the browser
  geoInvasives.innerHTML = `<p class="location-error">Geolocation is not supported by this browser.</p>`
  console.error("Geolocation is not supported by this browser.");
}

async function onFormSubmit(event) {
  event.preventDefault();
  identifyInvasive(encodedField.value, lat, lng);
  imageForm.reset();
}