import Feature2 from "./Feature";
import Footer from "./Footer";
import Hero from "./Hero";
import Note from "./Note";
import Private from "./Private";

export default function Landing() {
	return (
		<div className="overflow-hidden">
		<Hero />
		<Feature2 />
		<Private />
		<Note />
		<Footer />
	  </div>
	);
}
