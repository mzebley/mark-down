const fadeInScrollIndicator = () => {
  const indicator = window.document.querySelector('#scroll_indicator');
  setTimeout(() => {
    indicator.classList.add('opacity');
    setTimeout(() => {
      indicator.classList.add('bounce-top');
    }, 3000)
  }, 7500)
}

fadeInScrollIndicator();

const scrollToTeaser = () => {
  const targetElement = window.document.querySelector('#teaser');    
  targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center', 
    });
}

window.scrollToTeaser = scrollToTeaser;