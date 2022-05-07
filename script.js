"use strict";

class Workout {
	date = new Date();
	id = (Date.now() + "").slice(-10);
	clicks = 0;

	constructor(coords, distance, duration) {
		this.coords = coords; // [lat,lng]
		this.distance = distance; // in km
		this.duration = duration; // in min
	}
	_setDescription() {
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		this.description = `${
			this.type[0].toUpperCase() + this.type.slice(1)
		} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
	}

	click() {
		this.clicks++;
	}
}

class Running extends Workout {
	type = "running";
	constructor(coords, distance, duration, candence) {
		super(coords, distance, duration);
		this.candence = candence;
		this.calcPace();
		this._setDescription();
	}
	calcPace() {
		this.pace = this.duration / this.distance; // min/km
		return this.pace;
	}
}
class Cycling extends Workout {
	type = "cycling";
	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}
	calcSpeed() {
		this.speed = this.distance / (this.duration / 60); // km/min
		return this.speed;
	}
}

/*const run1 = new Running([10, 10], 5.2, 20, 150);
const cyc1 = new Cycling([10, 10], 10, 35, 550);
console.log(run1);
console.log(cyc1);*/
////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const removeIcon = document.querySelector(".remove-icon");
const reset = document.querySelector(".reset");

class App {
	#map;
	#mapZoomLevel = 10;
	#mapEvent;
	#workouts = [];
	#markers = [];

	constructor() {
		//Get user's position
		this._getPosition();

		//Get data from Local storage
		this._getLocalStorage();

		//Attach event handlers
		form.addEventListener("submit", this._newWorkout.bind(this));
		inputType.addEventListener(
			"change",
			this._toggleElevationField.bind(this)
		);
		containerWorkouts.addEventListener(
			"click",
			this._moveToPopup.bind(this)
		);

		reset.addEventListener("click", this.reset);
	}

	_getPosition() {
		if (navigator.geolocation)
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				function (err) {
					console.log(err.message);
					alert("Could not get your position");
				}
			);
	}

	_loadMap(position) {
		const { latitude, longitude } = position.coords;
		const coords = [latitude, longitude];

		this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

		L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);

		//Handling clicks on map
		this.#map.on("click", this._showForm.bind(this));

		//Render markers
		this.#workouts.forEach((work) => {
			this._renderWorkoutMarker(work);
		});
	}
	_showForm(mapE) {
		this.#mapEvent = mapE;
		// console.log(this.#mapEvent);

		form.classList.remove("hidden");
		inputDistance.focus();
	}
	_hideMForm() {
		form.style.display = "none";
		form.classList.add("hidden");
		setTimeout(() => (form.style.display = "grid"), 1000);
	}
	_toggleElevationField(e) {
		// console.dir(e.target.selectedIndex);
		// console.dir(e.target.value);
		inputCadence
			.closest(".form__row")
			.classList.toggle("form__row--hidden"); // Can use <inputCadence.parentElement> instead of <closest(".form__row")>
		inputElevation
			.closest(".form__row")
			.classList.toggle("form__row--hidden");
	}

	_newWorkout(e) {
		const validInputs = (...inputs) =>
			inputs.every((inp) => Number.isFinite(inp));

		const allPositiveNumber = (...inputs) => inputs.every((inp) => inp > 0);

		e.preventDefault(); //Prevent re-loading the page

		// Get data from form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;

		// If workout is running, create running object
		if (type === "running") {
			const cadence = +inputCadence.value;
			if (
				!validInputs(distance, duration, cadence) ||
				!allPositiveNumber(distance, duration, cadence)
			)
				return alert("Input have to be positive number"); // Check if data is valid

			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// If workout is cycling, create cycling object
		if (type === "cycling") {
			const elevation = +inputElevation.value;
			if (
				!validInputs(distance, duration, elevation) ||
				!allPositiveNumber(distance, duration)
			)
				return alert("Input have to be positive number"); // Check if data is valid

			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// Add the new object to workout array
		this.#workouts.push(workout);
		console.log(workout);

		// Render workout on map as marker
		this._renderWorkoutMarker(workout);

		// Render workout on map on list
		this._renderWorkout(workout);

		//Hide form + Clear inputs
		this._hideMForm();
		// Clear inputs
		inputDistance.value =
			inputDuration.value =
			inputCadence.value =
			inputElevation.value =
				"";

		// Set local storage to all workouts
		this._setLocalStorage();
	}

	_renderWorkoutMarker(workout) {
		const marker = L.marker(workout.coords);
		console.log(this.#markers);
		this.#markers.push(marker);

		marker
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`,
				})
			)
			.setPopupContent(
				`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} 
                ${workout.description}`
			)
			.openPopup();
	}

	_renderWorkout(workout) {
		let html = `<li class="workout workout--${workout.type}" data-id="${
			workout.id
		}">
					<div class="workout__title_bar">
						<h2 class="workout__title">${workout.description}  </h2>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="remove-icon h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</div>
                   
                    <div class="workout__details">
                        <span class="workout__icon">${
							workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
						}</span>
                        <span class="workout__value">${workout.distance}</span>
                        <span class="workout__unit">km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⏱</span>
                        <span class="workout__value">${workout.duration}</span>
                        <span class="workout__unit">min</span>
                    </div>`;

		if (workout.type === "running")
			html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">
                            ${workout.pace.toFixed(1)}
                        </span>
                        <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">🦶🏼</span>
                        <span class="workout__value">${workout.candence}</span>
                        <span class="workout__unit">spm</span>
                    </div>
                </li>`;

		if (workout.type === "cycling")
			html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">
                            ${workout.speed.toFixed(1)}
                        </span>
                        <span class="workout__unit">km/h</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⛰</span>
                        <span class="workout__value">${
							workout.elevationGain
						}</span>
                        <span class="workout__unit">m</span>
                    </div>
                    </li>`;

		// containerWorkouts.insertAdjacentHTML("beforeend", html);  -hari
		form.insertAdjacentHTML("afterend", html);
	}

	_moveToPopup(e) {
		const workoutEl = e.target.closest(".workout");
		const removeWorkout = e.target.closest(".remove-icon");

		if (!workoutEl) return;
		// console.dir(workoutEl.dataset.id);

		const workout = this.#workouts.find(
			(el) => el.id === workoutEl.dataset.id
		);
		console.log(workout);

		if (removeWorkout) this._removeWorkout(workout, workoutEl);
		// if remove is not pressed navigate to map marker
		else {
			this.#map.setView(workout.coords, this.#mapZoomLevel, {
				animate: true,
				pan: { duration: 1 },
			});
		}
		// workout.click(); //disabling it, because object obtained from localStaorage removes the prototype chain. hence can't access this function.
	}

	_removeWorkout(workout, workoutEl) {
		const indexToRemove = this.#workouts.findIndex((wo) => wo === workout);

		this.#workouts.splice(indexToRemove, 1);
		this.#map.removeLayer(this.#markers[indexToRemove]);
		this.#markers.splice(indexToRemove, 1);

		this._setLocalStorage();
		workoutEl.remove();
	}

	_setLocalStorage() {
		localStorage.setItem("workouts", JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem("workouts"));
		console.log(data);

		if (!data) return;
		this.#workouts = data;

		this.#workouts.forEach((work) => {
			this._renderWorkout(work);
		});
	}

	reset() {
		localStorage.removeItem("workouts");
		location.reload();
	}
}

const app = new App();
