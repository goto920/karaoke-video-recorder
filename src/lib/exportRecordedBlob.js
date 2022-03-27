export default async function exportRecordedBlob(blob,name) {
  if (blob === null) return false;

  // console.log('Blob.type', blob.type);
  const re = /\/(.*);/;
  const extension = re.exec(blob.type)[1];
  // console.log(extension);

  try {
     const saveLink = document.createElement("a");
     saveLink.href = URL.createObjectURL(blob);
     saveLink.download = name + "." + extension;
     document.body.appendChild(saveLink);
     saveLink.click();
     document.body.removeChild(saveLink);
     return true;
  } catch(err) {console.error(err);}

  return false;
}
