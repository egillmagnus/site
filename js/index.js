window.onload = function init() {

    let sections = document.querySelectorAll("section");
    let navlinks = document.querySelectorAll("header nav a");


    window.onscroll = () => {
        sections.forEach(section => {
            let top = window.scrollY;
            let offset = section.offsetTop - 150;
            let height = section.offsetHeight;
            let id = section.getAttribute("id");

            if (top >= offset && top < offset + height) {
                navlinks.forEach(link => {
                    link.classList.remove("active")
                    document.querySelector("header nav a[href*=" + id + "]").classList.add("active");
                });
            }
        });

        menuicon.classList.remove("bx-x");
        navbar.classList.remove("active");
    };




    let menuicon = document.querySelector("#menu-icon");
    let navbar = document.querySelector(".navbar")

    menuicon.onclick = () => {
        menuicon.classList.toggle("bx-x");
        navbar.classList.toggle("active");
    }
}