import { jest } from "@jest/globals"
import { recommendationFactory } from "../../src/factories/recommendationFactory"
import recommendationRepository from "../../src/repositories/recommendationRepository"
import { recommendationService } from "../../src/services/recommendationsService"

beforeEach(() => {
  jest.clearAllMocks()
})

jest.mock("../../src/repositories/recommendationRepository")

describe("Recommendations service test suite", () => {
  describe("Create test suite", () => {
    it("Given a right recommendation data, it should create a recommendation", async () => {
      jest
        .spyOn(recommendationRepository, "findByName")
        .mockResolvedValueOnce(null)
      jest.spyOn(recommendationRepository, "create").mockResolvedValueOnce(null)

      const recommendationData = recommendationFactory.createRandomData()
      const result = await recommendationService.insert(recommendationData)

      expect(recommendationRepository.findByName).toBeCalledTimes(1)
      expect(recommendationRepository.create).toBeCalledTimes(1)
    })

    it("Given a duplicated recommendation data, it should throw an conflict error", async () => {
      jest
        .spyOn(recommendationRepository, "findByName")
        .mockResolvedValueOnce(true as any)
      jest.spyOn(recommendationRepository, "create").mockResolvedValueOnce(null)

      const recommendationData = recommendationFactory.createRandomData()
      const result = recommendationService.insert(recommendationData)

      expect(result).rejects.toHaveProperty("type", "conflict")
    })
  })

  describe("Vote test suite", () => {
    describe("Up vote", () => {
      it("Should up vote a existing song recommendation", async () => {
        jest
          .spyOn(recommendationRepository, "find")
          .mockResolvedValueOnce(true as any)
        jest
          .spyOn(recommendationRepository, "updateScore")
          .mockResolvedValue(null)

        await recommendationService.upvote(1)

        expect(recommendationRepository.find).toBeCalledTimes(1)
        expect(recommendationRepository.updateScore).toBeCalledTimes(1)
      })

      it("Should not up vote a not existing song recommendation", async () => {
        jest.spyOn(recommendationRepository, "find").mockResolvedValueOnce(null)
        jest
          .spyOn(recommendationRepository, "updateScore")
          .mockResolvedValue(null)

        const result = recommendationService.upvote(1)

        expect(result).rejects.toHaveProperty("type", "not_found")
        expect(recommendationRepository.find).toBeCalledTimes(1)
        expect(recommendationRepository.updateScore).not.toBeCalled()
      })
    })
    describe("Down vote", () => {
      it("Should down vote a existing song recommendation", async () => {
        jest
          .spyOn(recommendationRepository, "find")
          .mockResolvedValueOnce(true as any)
        jest
          .spyOn(recommendationRepository, "updateScore")
          .mockResolvedValue(true as any)
        jest.spyOn(recommendationRepository, "remove")

        await recommendationService.downvote(1)

        expect(recommendationRepository.find).toBeCalledTimes(1)
        expect(recommendationRepository.updateScore).toBeCalledTimes(1)
        expect(recommendationRepository.remove).not.toBeCalled()
      })

      it("Should not down vote a not existing song recommendation", async () => {
        jest.spyOn(recommendationRepository, "find").mockResolvedValueOnce(null)
        jest
          .spyOn(recommendationRepository, "updateScore")
          .mockResolvedValue(null)
        jest.spyOn(recommendationRepository, "remove")

        const result = recommendationService.downvote(1)

        expect(result).rejects.toHaveProperty("type", "not_found")
        expect(recommendationRepository.find).toBeCalledTimes(1)
        expect(recommendationRepository.updateScore).not.toBeCalled()
        expect(recommendationRepository.remove).not.toBeCalled()
      })

      it("Should remove a song that had a score of -5 when down voted", async () => {
        jest
          .spyOn(recommendationRepository, "find")
          .mockResolvedValueOnce(true as any)
        jest
          .spyOn(recommendationRepository, "updateScore")
          .mockResolvedValue({ score: -6 } as any)
        jest
          .spyOn(recommendationRepository, "remove")
          .mockResolvedValueOnce(null)

        await recommendationService.downvote(1)

        expect(recommendationRepository.find).toBeCalledTimes(1)
        expect(recommendationRepository.updateScore).toBeCalledTimes(1)
        expect(recommendationRepository.remove).toBeCalledTimes(1)
      })
    })
  })

  describe("Get by id", () => {
    it("given a valid id, it should return a song recommendation", async () => {
      const songRecommendation = {
        id: 1,
        score: 0,
        name: "testSong",
        youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
      }
      jest
        .spyOn(recommendationRepository, "find")
        .mockResolvedValueOnce(songRecommendation)

      const result = await recommendationService.getById(songRecommendation.id)

      expect(result).toEqual(songRecommendation)
      expect(recommendationRepository.find).toBeCalledTimes(1)
    })

    it("given a not valid id, it should throw a not found error", async () => {
      jest.spyOn(recommendationRepository, "find").mockResolvedValueOnce(null)

      const result = recommendationService.getById(1)

      expect(result).rejects.toHaveProperty("type", "not_found")
      expect(recommendationRepository.find).toBeCalledTimes(1)
    })

    it("it should return all song recommendations", async () => {
      jest
        .spyOn(recommendationRepository, "findAll")
        .mockResolvedValueOnce(true as any)

      const result = await recommendationService.get()

      expect(recommendationRepository.findAll).toBeCalledTimes(1)
      expect(result).not.toBeNull()
    })

    it("it should return an array with the right amount of song recommendations", async () => {
      const recommendations = new Array(20)

      jest
        .spyOn(recommendationRepository, "getAmountByScore")
        .mockResolvedValueOnce([...recommendations].slice(0, 10) as any)

      const result = await recommendationService.getTop(10)

      expect(recommendationRepository.getAmountByScore).toBeCalledTimes(1)
      expect(result.length).toBe(10)
    })

    describe("getRandom tests", () => {
      it("it should return a song recommendation object with a score lower than or equal 10", async () => {
        const recommendations = [
          {
            id: 1,
            score: 5,
            name: "testSong",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
          {
            id: 2,
            score: 11,
            name: "testSong2",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
        ]

        jest.spyOn(Math, "random").mockImplementation(() => {
          return 0.8
        })
        jest
          .spyOn(recommendationRepository, "findAll")
          .mockResolvedValueOnce([recommendations[0]] as any)

        const result = await recommendationService.getRandom()

        expect(result).toEqual(recommendations[0])
        expect(recommendationRepository.findAll).toBeCalledTimes(1)
        expect(recommendationRepository.findAll).toBeCalledWith({
          score: 10,
          scoreFilter: "lte",
        })
      })

      it("it should return a song recommendation object with a score greater than 10", async () => {
        const recommendations = [
          {
            id: 1,
            score: 5,
            name: "testSong",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
          {
            id: 2,
            score: 11,
            name: "testSong2",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
        ]

        jest.spyOn(Math, "random").mockImplementation(() => {
          return 0.4
        })
        jest
          .spyOn(recommendationRepository, "findAll")
          .mockResolvedValueOnce([recommendations[1]] as any)

        const result = await recommendationService.getRandom()

        expect(result).toEqual(recommendations[1])
        expect(recommendationRepository.findAll).toBeCalledTimes(1)
        expect(recommendationRepository.findAll).toBeCalledWith({
          score: 10,
          scoreFilter: "gt",
        })
      })

      it("if there are no song recommendations, it should throw a not found error", async () => {
        jest
          .spyOn(recommendationRepository, "findAll")
          .mockResolvedValue([] as any)

        const result = recommendationService.getRandom()

        expect(result).rejects.toHaveProperty("type", "not_found")
        expect(recommendationRepository.findAll).toBeCalled()
      })

      it("if there are only song recommendations with score greater than 10, it should return one of them", async () => {
        const recommendations = [
          {
            id: 1,
            score: 15,
            name: "testSong",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
          {
            id: 2,
            score: 11,
            name: "testSong2",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
        ]

        jest.spyOn(Math, "random").mockImplementation(() => {
          return 0.8
        })
        jest
          .spyOn(recommendationRepository, "findAll")
          .mockResolvedValueOnce([] as any)
          .mockResolvedValueOnce([recommendations[0]] as any)

        const result = await recommendationService.getRandom()

        expect(result).toEqual(recommendations[0])
        expect(recommendationRepository.findAll).toBeCalledTimes(2)
        expect(recommendationRepository.findAll).toBeCalledWith({
          score: 10,
          scoreFilter: "lte",
        })
      })

      it("if there are only song recommendations with score lower than or equal 10, it should return one of them", async () => {
        const recommendations = [
          {
            id: 1,
            score: 1,
            name: "testSong",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
          {
            id: 2,
            score: 2,
            name: "testSong2",
            youtubeLink: "https://www.youtube.com/watch?v=d8zXQA5Za9M",
          },
        ]

        jest.spyOn(Math, "random").mockImplementation(() => {
          return 0.4
        })
        jest
          .spyOn(recommendationRepository, "findAll")
          .mockResolvedValueOnce([] as any)
          .mockResolvedValueOnce([recommendations[0]] as any)

        const result = await recommendationService.getRandom()

        expect(result).toEqual(recommendations[0])
        expect(recommendationRepository.findAll).toBeCalledTimes(2)
        expect(recommendationRepository.findAll).toBeCalledWith({
          score: 10,
          scoreFilter: "gt",
        })
      })
    })
  })
})
