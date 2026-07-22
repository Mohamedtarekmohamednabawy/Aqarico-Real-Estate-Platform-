// LandingPage.jsx
import Hero from "../components/Hero";
import Listings from "../components/Listing";
import Agents from "../components/Agents";
import Contact from "../components/Contact";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

import authService from "../services/authService";

const LandingPage = () => {
    const loggedInUser = authService.getCurrentUser();

    return (
        <div className="overflow-x-hidden">
            <NavBar />
            <main>
                <Hero />
                <Listings />
                {loggedInUser && <Agents />}
                <Contact />
            </main>
            <Footer />
        </div>
    );
}

export default LandingPage;