const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths to files
const outputFilePath = path.join(__dirname, 'output.css'); // Temporary output file
const htmlFilePath = path.join(__dirname, 'index.html');

// Step 1: Build the Tailwind CSS and save it to a temporary output file
exec('npx tailwindcss -i ./input.css -o ./output.css --minify', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error building Tailwind CSS: ${stderr}`);
        return;
    }

    // Step 2: Read the generated CSS from the output file
    fs.readFile(outputFilePath, 'utf8', (err, cssContent) => {
        if (err) {
            console.error('Error reading CSS file:', err);
            return;
        }

        // Step 3: Read the existing index.html file
        fs.readFile(htmlFilePath, 'utf8', (err, htmlContent) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                return;
            }

            // Step 4: Insert the CSS content into a <style> tag in the <head> of the HTML
            const updatedHtml = htmlContent.replace(
                /<style>.*<\/style>/s, // Replace any existing <style> tag
                `<style>\n${cssContent}\n</style>`
            );

            // Step 5: Write the updated HTML back to the file
            fs.writeFile(htmlFilePath, updatedHtml, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing updated HTML file:', err);
                    return;
                }
                console.log('Tailwind CSS successfully injected into index.html!');
            });
        });
    });
});