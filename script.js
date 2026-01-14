function toggleVisibility(event) {
    event.preventDefault();

    // 1. Define the mapping (Menu Class : Content Class)
    const menuMapping = {
        'item-1': '.data-source',
        'item-2': '.methodology', // Assuming you'll add this class later
        'item-3': '.report-fire',
        'item-4': '.contact'
    };

    // 2. Identify which item was clicked
    // We look for the div inside the clicked link
    const clickedItem = event.currentTarget.querySelector('.menuitem');
    
    // 3. Find the specific "item-x" class
    // This finds the class that starts with "item-"
    const itemClass = Array.from(clickedItem.classList).find(cls => cls.startsWith('item-'));

    // 4. Get the target selector from our dictionary
    const targetSelector = menuMapping[itemClass];
    const targetDiv = document.querySelector(targetSelector);

    if (targetDiv) {
        // Toggle the target
        const isVisible = targetDiv.style.display === "block";
        
        // Optional: Hide all other data sections first for a "tab" effect
        document.querySelectorAll('.left').forEach(div => div.style.display = 'none');

        // Show/Hide the clicked one
        targetDiv.style.display = isVisible ? "none" : "block";
        
        // 5. Force Mapbox to recalculate its size now that the layout changed
        if (typeof map !== 'undefined') {
            map.resize();
        }
    }
}