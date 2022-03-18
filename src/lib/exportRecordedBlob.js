export default async function exportRecordedBlob(blob,name) {
  if (blob === null) return false;

  try {
     const saveLink = document.createElement("a");
     saveLink.href = URL.createObjectURL(blob);
     saveLink.download = name + ".webm";
     document.body.appendChild(saveLink);
     saveLink.click();
     document.body.removeChild(saveLink);
     return true;
  } catch(err) {console.error(err);}

  return false;
}
