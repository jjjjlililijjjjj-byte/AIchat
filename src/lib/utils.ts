export const handleImageUpload = (callback: (base64: string) => void) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          callback(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
};
