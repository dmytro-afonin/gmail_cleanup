// Define your raw CSS input as a string
const rawCss = `
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
`;

// Run the Tailwind CSS command directly using `npx`
const command = new Deno.Command("npx", {
    args: ["tailwindcss", "--minify"], // Tailwind CSS with the --minify flag
    stdin: "piped", // Pipe the raw CSS as input
    stdout: "piped", // Capture the standard output (processed/minified CSS)
    stderr: "piped", // Capture standard error
});

// Execute the command and get the output
const process = command.spawn();

// Write the raw CSS to stdin
const writer = process.stdin.getWriter();
await writer.write(new TextEncoder().encode(rawCss)); // Send the raw CSS input
await writer.close(); // Close stdin after sending the input

// Capture the minified CSS from stdout
const { stdout, stderr } = await process.output();
const minifiedCss = new TextDecoder().decode(stdout);
const errorOutput = new TextDecoder().decode(stderr);

// Handle the output
if (minifiedCss) {
    // Optionally, if you want to inject it directly into the HTML:
    const htmlFilePath = "./index.html";
    const htmlContent = await Deno.readTextFile(htmlFilePath);

    // Insert the minified CSS inside a <style> tag in the <head> of the HTML
    const updatedHtml = htmlContent.replace(
        /<style>.*<\/style>/s, // Replace any existing <style> tag
        `<style>\n${minifiedCss}\n</style>`
    );

    // Write the updated HTML back to the file
    await Deno.writeTextFile(htmlFilePath, updatedHtml);
    console.log("Tailwind CSS successfully injected into index.html!");

} else if (errorOutput) {
    console.error("Error occurred:\n", errorOutput);
}

// No need for process.status() in this case, the script ends here.