console.log(new Error('Error out of main'))

function main () {
  console.log(new Error('Error in main'))
  ;(() => {
    console.log(new Error('Error in unnamed arrow function'))
  })()
  ;(function () {
    console.log(new Error('Error in unnamed function'))
  })()
}

main()
