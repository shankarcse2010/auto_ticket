let faceMatcher, canvas;
const users = [];

window.onload=()=>{
  const video = document.getElementById('video')
  document.querySelector('.take-photo').addEventListener('click', takePhoto)
  document.querySelector('.save').addEventListener('click', savePhoto)
  document.querySelector('.clear').addEventListener('click', clearPhoto)
}


Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(start)

async function start() {
  const container = document.createElement('div')
  container.style.position = 'relative'
  document.body.append(container)
  startVideo()

}
function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
  document.querySelector('.loader').style.display = 'none'
}
video.addEventListener('play', () => {
  canvas = faceapi.createCanvasFromMedia(video)
  document.querySelector('.video-wrapper').appendChild(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    if (faceMatcher) {
      const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
        drawBox.draw(canvas)
      })
    }
  }, 100)

})

function takePhoto() {
  const img = document.createElement('img');
  img.classList.add('img-thumbnail')
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  img.src = canvas.toDataURL('image/webp');
  document.querySelector('.img-wrapper').appendChild(img)
}

async function savePhoto() {
  const photoStorage = window.sessionStorage;
  const images = Array.from(document.querySelectorAll('img')).map(ele => ele.src)
  const user = document.querySelector('#user-name').value
  users.push(user)
  photoStorage.setItem(user, JSON.stringify(images))
  clearPhoto()
  const labeledFaceDescriptors = await Promise.all(
    users.map(async label => {
      const descriptions = []
      const photoList = await JSON.parse(photoStorage.getItem(label))
      photoList.forEach(async element => {
        const img = await faceapi.fetchImage(element)
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        descriptions.push(detections.descriptor)
      });

      return new faceapi.LabeledFaceDescriptors(label, descriptions)
    })
  )
  
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)
}

function clearPhoto() {
  const node = document.querySelector('.img-wrapper')
  document.querySelector('#user-name').value = ''
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }

}

function loadLabeledImages() {
  const labels = ['Black Widow', 'Captain America', 'Captain Marvel', 'Hawkeye', 'Jim Rhodes', 'Thor', 'Tony Stark', 'Gowrishankar']
  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`${window.location.origin}/labeled_images/${label}/${i}.jpg`)
        console.log(`${window.location.origin}/labeled_images/${label}/${i}.jpg`);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        descriptions.push(detections.descriptor)
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions)
    })
  )
}
