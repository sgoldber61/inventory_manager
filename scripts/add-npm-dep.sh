# If first argument is dev
if [ $1 = "dev" ] && [ ! -z $2 ]; then
  DEV=true
  # Take all packages to be installed
  PACKAGE=${@:2}
# If first argument is not empty
elif [ ! -z $1 ]; then
  DEV=false
  # Take all packages to be installed
  PACKAGE=$@
else
  echo "Format:"
  echo "- Dev dependencies: 'npm run add-dep dev <PACKAGE1> <PACKAGE2> ...'."
  echo "- Regular dependencies: 'npm run add-dep <PACKAGE1> <PACKAGE2> ...'"
  exit 1
fi

# Enter into the Docker container in bash and run npm install --save/dev
if [ $DEV = true ]; then
  echo -e "Installing '$PACKAGE' in docker container as dev dependencies..."
  docker-compose run --rm --service-ports bash npm install --save-dev $PACKAGE
else
  echo -e "Installing '$PACKAGE' in docker container as dependencies..."
  docker-compose run --rm --service-ports bash npm install --save $PACKAGE
fi

echo "package.json updated"
echo "Removing existing image from local environment..."
docker image rm sgoldber61/inv-dev --force
echo "Rebuilding image with updated package.json..."
docker build -t sgoldber61/inv-dev -f Dockerfile-dev .
echo ""

# To push to Docker hub, run:
# docker push sgoldber61/inv-dev
