document.addEventListener('DOMContentLoaded', () => {
    const addOrganizationBtn = document.getElementById('addOrganizationBtn');
    const addEventBtn = document.getElementById('addEventBtn');
    const organizationModal = document.getElementById('organizationModal');
    const eventModal = document.getElementById('eventModal');
    const closeBtns = document.querySelectorAll('.modal .close-btn');
    const cancelBtns = document.querySelectorAll('.modal .cancel-btn');
    const tabs = document.querySelectorAll('.header-tabs .tab');
    const contentSections = document.querySelectorAll('.content-section');

    const orgLogoFileInput = document.getElementById('orgLogoFile');
    const orgLogoUploadBtn = document.querySelector('.upload-btn[for="orgLogoFile"]');
    const logoPreview = document.getElementById('logo-preview');

    function showModal(modal) {
        modal.style.display = 'flex';
    }

    function hideModal(modal) {
        modal.style.display = 'none';
        if (modal.id === 'organizationModal') {
            logoPreview.src = '#';
            logoPreview.style.display = 'none';
            orgLogoUploadBtn.style.display = 'block'; 
            orgLogoFileInput.value = ''; 
        }
    }

    if (addOrganizationBtn) {
        addOrganizationBtn.addEventListener('click', () => {
            showModal(organizationModal);
        });
    }

    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            showModal(eventModal);
        });
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal(btn.closest('.modal'));
        });
    });

    cancelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal(btn.closest('.modal'));
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === organizationModal) {
            hideModal(organizationModal);
        }
        if (event.target === eventModal) {
            hideModal(eventModal);
        }
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', (event) => {
            event.preventDefault();

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const sectionId = tab.getAttribute('data-section');
            contentSections.forEach(section => {
                if (section.id === sectionId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });

    if (orgLogoFileInput) {
        orgLogoFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block';
                    orgLogoUploadBtn.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (logoPreview) {
        logoPreview.addEventListener('click', function() {
            orgLogoFileInput.click();
        });
    }
});