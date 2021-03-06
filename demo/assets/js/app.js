// This code uses:
//
// * babel-polyfill (https://babeljs.io/docs/usage/polyfill/)
// * whatwg-fetch (https://github.github.io/fetch/)
// * uppy (https://uppy.io)

function singleFileUpload(fileInput) {
  var imagePreview = document.getElementById(fileInput.dataset.previewElement)
  var formGroup    = fileInput.parentNode

  formGroup.removeChild(fileInput)

  var uppy = fileUpload(fileInput)

  uppy
    .use(Uppy.FileInput, {
      target: formGroup,
      locale: { strings: { chooseFiles: 'Choose file' } },
    })
    .use(Uppy.Informer, {
      target: formGroup,
    })
    .use(Uppy.ProgressBar, {
      target: imagePreview.parentNode,
    })

  uppy.on('upload-success', function (file, data) {
    // show image preview
    imagePreview.src = URL.createObjectURL(file.data)

    var uploadedFileData = window.uploadedFileData(data, fileInput)

    // set hidden field value to the uploaded file data so that it's submitted with the form as the attachment
    var hiddenInput = document.getElementById(fileInput.dataset.uploadResultElement)
    hiddenInput.value = uploadedFileData
  })
}

function multipleFileUpload(fileInput) {
  var formGroup = fileInput.parentNode

  var uppy = fileUpload(fileInput)

  uppy
    .use(Uppy.Dashboard, {
      target: formGroup,
      inline: true,
      height: 300,
      replaceTargetContent: true,
    })

  uppy.on('upload-success', function (file, data) {
    hiddenField = document.createElement('input')
    hiddenField.type = 'hidden'
    hiddenField.name = 'album[photos_attributes]['+ Math.random().toString(36).substr(2, 9) + '][image]'
    hiddenField.value = window.uploadedFileData(data, fileInput)

    document.querySelector('form').appendChild(hiddenField)
  })
}

function fileUpload(fileInput) {
  var uppy = Uppy.Core({
      id: fileInput.id,
      autoProceed: true,
      restrictions: {
        allowedFileTypes: fileInput.accept.split(','),
      },
    })

  if (fileInput.dataset.uploadServer == 's3') {
    uppy.use(Uppy.AwsS3, {
      serverUrl: '/', // will call Shrine's presign endpoint mounted on `/s3/params`
    })
  } else {
    uppy.use(Uppy.XHRUpload, {
      endpoint: '/upload', // Shrine's upload endpoint
      fieldName: 'file',
      headers: { 'X-CSRF-Token': fileInput.dataset.uploadCsrfToken }
    })
  }

  return uppy
}

function uploadedFileData(data, fileInput) {
  if (fileInput.dataset.uploadServer == 's3') {
    // construct uploaded file data in the format that Shrine expects
    return JSON.stringify({
      id: file.meta['key'].match(/^cache\/(.+)/)[1], // object key without prefix
      storage: 'cache',
      metadata: {
        size:      file.size,
        filename:  file.name,
        mime_type: file.type,
      }
    })
  } else {
    return JSON.stringify(data.body)
  }
}

document.querySelectorAll('input[type=file]').forEach(function (fileInput) {
  if (fileInput.multiple) {
    multipleFileUpload(fileInput)
  } else {
    singleFileUpload(fileInput)
  }
})
