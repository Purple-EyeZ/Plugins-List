// SNOWFALL !!
function createSnowfall() {
	const snowContainer = document.createElement("div");
	snowContainer.id = "snow-container";
	document.body.appendChild(snowContainer);

	const snowflakeChars = ["❄", "❅", "❆"];
	const DENSITY = 20000; // One snowflake per 20,000 pixels squared
	const screenArea = window.innerWidth * window.innerHeight;
	const numberOfSnowflakes = Math.max(
		30,
		Math.min(Math.floor(screenArea / DENSITY), 150),
	);

	for (let i = 0; i < numberOfSnowflakes; i++) {
		const snowflake = document.createElement("span");
		snowflake.classList.add("snowflake");

		snowflake.textContent =
			snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];

		const startRotation = Math.random() * 360;
		const endRotation =
			startRotation +
			(Math.random() * 360 + 360) * (Math.random() < 0.5 ? 1 : -1);
		snowflake.style.setProperty("--start-rotation", `${startRotation}deg`);
		snowflake.style.setProperty("--end-rotation", `${endRotation}deg`);

		snowflake.style.left = `${Math.random() * 100}vw`;
		snowflake.style.animationDuration = `${Math.random() * 8 + 7}s`;
		snowflake.style.animationDelay = `-${Math.random() * 10}s`;
		snowflake.style.fontSize = `${Math.random() * 16 + 10}px`;
		snowflake.style.opacity = Math.random() * 0.7 + 0.3;

		snowContainer.appendChild(snowflake);
	}
}

window.addEventListener("DOMContentLoaded", createSnowfall);
